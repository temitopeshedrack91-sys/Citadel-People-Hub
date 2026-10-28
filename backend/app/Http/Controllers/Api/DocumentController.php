<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HubDocument;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $documents = HubDocument::query()
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->when($request->filled('accessLevel'), fn ($query) => $query->where('access_level', $request->accessLevel))
            ->with('uploadedBy:id,name')
            ->orderByDesc('created_at')->limit(500)->get()
            ->filter(fn (HubDocument $document) => $this->canAccess($request, $document))
            ->values()
            ->map(fn (HubDocument $document) => $this->present($document));

        return response()->json(['data' => $documents]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'PCCM_SUPER_ADMIN', 403, 'Only PCCM can upload managed documents.');
        $data = $request->validate([
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', Rule::in(['Company Policy', 'Employee Contract', 'Identification', 'Academic & Professional', 'Medical & HMO', 'Performance Appraisal', 'PCCM Form / Template'])],
            'accessLevel' => ['required', Rule::in(['Public', 'Departmental', 'Restricted_PCCM_Only', 'PCCM_Only'])],
            'entityScope' => ['nullable', 'string', 'max:180'],
            'departmentScope' => ['required_if:accessLevel,Departmental', 'nullable', 'string', 'max:180'],
            'version' => ['nullable', 'string', 'max:30'],
            'isSensitive' => ['sometimes', 'boolean'],
        ]);

        $file = $data['file'];
        $disk = config('filesystems.default');
        $path = $file->store('hub-documents', $disk);
        if ($path === false) {
            throw new \RuntimeException('The uploaded document could not be stored.');
        }
        try {
            $document = DB::transaction(function () use ($data, $file, $path, $request) {
                $document = HubDocument::create([
                    'title' => $data['title'],
                    'description' => $data['description'] ?? null,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'file_type' => $file->getClientMimeType(),
                    'category' => $data['category'],
                    'access_level' => $data['accessLevel'],
                    'entity_scope' => $data['entityScope'] ?? null,
                    'department_scope' => $data['departmentScope'] ?? null,
                    'uploaded_by' => $request->user()->id,
                    'version' => $data['version'] ?? '1.0',
                    'storage_path' => $path,
                    'is_sensitive' => $data['isSensitive'] ?? false,
                ]);
                AuditLogger::record($request, 'Documents & Policies', 'Uploaded document', $document->id, $document->title, null, $document->category);

                return $document;
            });
        } catch (Throwable $exception) {
            Storage::disk($disk)->delete($path);
            throw $exception;
        }

        return response()->json(['data' => $this->present($document)], 201);
    }

    public function download(Request $request, HubDocument $document)
    {
        abort_unless($this->canAccess($request, $document), 404);
        abort_unless(Storage::disk(config('filesystems.default'))->exists($document->storage_path), 404);

        return Storage::disk(config('filesystems.default'))->download($document->storage_path, $document->file_name);
    }

    private function canAccess(Request $request, HubDocument $document): bool
    {
        $user = $request->user();
        if ($user->role === 'PCCM_SUPER_ADMIN') {
            return true;
        }
        if ($document->is_sensitive || in_array($document->access_level, ['Restricted_PCCM_Only', 'PCCM_Only'], true)) {
            return false;
        }
        if ($document->entity_scope && $document->entity_scope !== 'All Citadel Entities') {
            if (! $user->entity || $document->entity_scope !== $user->entity->name) {
                return false;
            }
        }
        if ($document->access_level === 'Departmental') {
            if (! $document->department_scope || ! $user->department || $document->department_scope !== $user->department->name) {
                return false;
            }
        }

        return true;
    }

    private function present(HubDocument $document): array
    {
        return [
            'id' => $document->id,
            'title' => $document->title,
            'description' => $document->description,
            'fileName' => $document->file_name,
            'fileSize' => (string) $document->file_size,
            'fileType' => $document->file_type,
            'category' => $document->category,
            'accessLevel' => $document->access_level,
            'entityScope' => $document->entity_scope,
            'departmentScope' => $document->department_scope,
            'uploadedBy' => $document->uploadedBy?->name ?? 'Staff',
            'uploadedDate' => $document->created_at?->toISOString(),
            'version' => $document->version,
            'downloadUrl' => url("/api/v1/documents/{$document->id}/download"),
            'isSensitive' => $document->is_sensitive,
        ];
    }
}
