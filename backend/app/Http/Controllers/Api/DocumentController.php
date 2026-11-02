<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HubDocument;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
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
            ->when($request->filled('employeeId'), fn ($query) => $query->where('employee_id', $request->employeeId))
            ->with(['uploadedBy:id,name', 'employee:id,staff_id,full_name'])
            ->orderByDesc('created_at')->limit(500)->get()
            ->filter(fn (HubDocument $document) => $this->canAccess($request, $document))
            ->values()
            ->map(fn (HubDocument $document) => $this->present($document));

        return response()->json(['data' => $documents]);
    }

    public function forEmployee(Request $request, Employee $employee): JsonResponse
    {
        abort_unless($this->canViewEmployeeDocuments($request, $employee), 403);

        $documents = HubDocument::query()
            ->where('employee_id', $employee->id)
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->with(['uploadedBy:id,name'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (HubDocument $document) => $this->present($document));

        return response()->json(['data' => $documents]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(RoleAuthorization::canonical($request->user()->role) === 'HR_STAFF', 403, 'Only HR staff can upload managed documents.');
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

    public function storeEmployeeDocument(Request $request, Employee $employee): JsonResponse
    {
        abort_unless($this->canManageEmployeeDocuments($request, $employee), 403);

        $data = $request->validate([
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,jpg,jpeg,png'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', Rule::in([
                'Educational Certificate',
                'Professional Certification',
                'CV/Resume',
                'National Identification',
                'Employment Letter',
                'Previous Employment Document',
                'Medical Fitness Certificate',
                'Other Supporting Document',
            ])],
            'issueDate' => ['nullable', 'date_format:Y-m-d'],
            'expiryDate' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:issueDate'],
            'version' => ['nullable', 'string', 'max:30'],
        ]);

        $file = $data['file'];
        $disk = config('filesystems.default');
        $path = $file->store('employee-documents/'.$employee->id, $disk);
        if ($path === false) {
            throw new \RuntimeException('The uploaded document could not be stored.');
        }

        try {
            $document = DB::transaction(function () use ($data, $file, $path, $request, $employee) {
                $document = HubDocument::create([
                    'employee_id' => $employee->id,
                    'title' => $data['title'],
                    'description' => $data['description'] ?? null,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'file_type' => $file->getClientMimeType(),
                    'category' => $data['category'],
                    'access_level' => 'Departmental',
                    'entity_scope' => $employee->entity?->name ?? null,
                    'department_scope' => $employee->department?->name ?? null,
                    'uploaded_by' => $request->user()->id,
                    'version' => $data['version'] ?? '1.0',
                    'version_number' => 1,
                    'issue_date' => $data['issueDate'] ?? null,
                    'expiry_date' => $data['expiryDate'] ?? null,
                    'storage_path' => $path,
                    'is_sensitive' => true,
                ]);
                AuditLogger::record($request, 'Employee Documents', 'Uploaded employee document', $document->id, $document->title, null, $document->category);

                return $document;
            });
        } catch (Throwable $exception) {
            Storage::disk($disk)->delete($path);
            throw $exception;
        }

        return response()->json(['data' => $this->present($document)], 201);
    }

    public function replaceEmployeeDocument(Request $request, Employee $employee, HubDocument $document): JsonResponse
    {
        abort_unless($document->employee_id === $employee->id, 404);
        abort_unless($this->canManageEmployeeDocuments($request, $employee), 403);
        abort_unless($this->canReplaceDocument($request, $document), 403);

        $data = $request->validate([
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,jpg,jpeg,png'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', Rule::in([
                'Educational Certificate',
                'Professional Certification',
                'CV/Resume',
                'National Identification',
                'Employment Letter',
                'Previous Employment Document',
                'Medical Fitness Certificate',
                'Other Supporting Document',
            ])],
            'issueDate' => ['nullable', 'date_format:Y-m-d'],
            'expiryDate' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:issueDate'],
            'version' => ['nullable', 'string', 'max:30'],
        ]);

        $file = $data['file'];
        $disk = config('filesystems.default');
        $path = $file->store('employee-documents/'.$employee->id, $disk);
        if ($path === false) {
            throw new \RuntimeException('The uploaded document could not be stored.');
        }

        try {
            $newDocument = DB::transaction(function () use ($data, $file, $path, $request, $employee, $document) {
                Storage::disk($disk)->delete($document->storage_path);

                $newDocument = HubDocument::create([
                    'employee_id' => $employee->id,
                    'title' => $data['title'],
                    'description' => $data['description'] ?? null,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'file_type' => $file->getClientMimeType(),
                    'category' => $data['category'],
                    'access_level' => 'Departmental',
                    'entity_scope' => $employee->entity?->name ?? null,
                    'department_scope' => $employee->department?->name ?? null,
                    'uploaded_by' => $request->user()->id,
                    'version' => $data['version'] ?? ($document->version_number + 1).'.0',
                    'version_number' => $document->version_number + 1,
                    'previous_version_id' => $document->id,
                    'issue_date' => $data['issueDate'] ?? null,
                    'expiry_date' => $data['expiryDate'] ?? null,
                    'storage_path' => $path,
                    'is_sensitive' => true,
                ]);
                AuditLogger::record($request, 'Employee Documents', 'Replaced employee document', $newDocument->id, $newDocument->title, $document->file_name, $newDocument->category);

                return $newDocument;
            });
        } catch (Throwable $exception) {
            Storage::disk($disk)->delete($path);
            throw $exception;
        }

        return response()->json(['data' => $this->present($newDocument)]);
    }

    public function deleteEmployeeDocument(Request $request, Employee $employee, HubDocument $document): JsonResponse
    {
        abort_unless($document->employee_id === $employee->id, 404);
        abort_unless($this->canManageEmployeeDocuments($request, $employee), 403);
        abort_unless($this->canDeleteDocument($request, $document), 403);

        $disk = config('filesystems.default');
        $path = $document->storage_path;

        try {
            DB::transaction(function () use ($request, $document, $disk, $path) {
                $title = $document->title;
                $category = $document->category;
                $fileName = $document->file_name;
                $document->delete();
                Storage::disk($disk)->delete($path);
                AuditLogger::record($request, 'Employee Documents', 'Deleted employee document', $document->id, $title, $fileName, $category);
            });
        } catch (Throwable $exception) {
            throw $exception;
        }

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    public function download(Request $request, HubDocument $document): JsonResponse
    {
        abort_unless($this->canAccess($request, $document), 404);
        abort_unless(Storage::disk(config('filesystems.default'))->exists($document->storage_path), 404);

        AuditLogger::record($request, 'Documents & Policies', 'Downloaded document', $document->id, $document->title, null, $document->category);

        return Storage::disk(config('filesystems.default'))->download($document->storage_path, $document->file_name);
    }

    public function downloadEmployeeDocument(Request $request, Employee $employee, HubDocument $document): JsonResponse
    {
        abort_unless($document->employee_id === $employee->id, 404);
        abort_unless($this->canAccessEmployeeDocument($request, $employee, $document), 403);
        abort_unless(Storage::disk(config('filesystems.default'))->exists($document->storage_path), 404);

        AuditLogger::record($request, 'Employee Documents', 'Downloaded employee document', $document->id, $document->title, null, $document->category);

        return Storage::disk(config('filesystems.default'))->download($document->storage_path, $document->file_name);
    }

    private function canAccess(Request $request, HubDocument $document): bool
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);
        if ($role === 'HR_STAFF') {
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

    private function canViewEmployeeDocuments(Request $request, Employee $employee): bool
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);

        if ($role === 'HR_STAFF') {
            return true;
        }

        if ($role === 'BUSINESS_HEAD' && $user->entity_id !== null) {
            return (string) $employee->entity_id === (string) $user->entity_id;
        }

        if ($role === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
            return (string) $employee->department_id === (string) $user->department_id;
        }

        if ($role === 'EMPLOYEE') {
            return (string) $employee->id === (string) $user->employee?->id;
        }

        if (in_array($role, ['HR_STAFF'], true)) {
            return true;
        }

        return false;
    }

    private function canManageEmployeeDocuments(Request $request, Employee $employee): bool
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);

        if ($role === 'HR_STAFF') {
            return true;
        }

        if ($role === 'BUSINESS_HEAD' && $user->entity_id !== null) {
            return (string) $employee->entity_id === (string) $user->entity_id;
        }

        if ($role === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
            return (string) $employee->department_id === (string) $user->department_id;
        }

        if ($role === 'EMPLOYEE') {
            return (string) $employee->id === (string) $user->employee?->id;
        }

        return false;
    }

    private function canReplaceDocument(Request $request, HubDocument $document): bool
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);

        if ($role === 'HR_STAFF') {
            return true;
        }

        if ($role === 'BUSINESS_HEAD' && $user->entity_id !== null) {
            return true;
        }

        if ($role === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
            return true;
        }

        if ($role === 'EMPLOYEE') {
            return (string) $document->uploaded_by === (string) $user->id;
        }

        return false;
    }

    private function canDeleteDocument(Request $request, HubDocument $document): bool
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);

        if ($role === 'HR_STAFF') {
            return true;
        }

        if ($role === 'BUSINESS_HEAD' && $user->entity_id !== null) {
            return true;
        }

        if ($role === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
            return true;
        }

        if ($role === 'EMPLOYEE') {
            return (string) $document->uploaded_by === (string) $user->id;
        }

        return false;
    }

    private function canAccessEmployeeDocument(Request $request, Employee $employee, HubDocument $document): bool
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);

        if ($role === 'HR_STAFF') {
            return true;
        }

        if ($role === 'BUSINESS_HEAD' && $user->entity_id !== null) {
            return (string) $employee->entity_id === (string) $user->entity_id;
        }

        if ($role === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
            return (string) $employee->department_id === (string) $user->department_id;
        }

        if ($role === 'EMPLOYEE') {
            return (string) $employee->id === (string) $user->employee?->id;
        }

        return false;
    }

    private function present(HubDocument $document): array
    {
        return [
            'id' => $document->id,
            'employeeId' => $document->employee_id,
            'employeeStaffId' => $document->employee?->staff_id,
            'employeeName' => $document->employee?->full_name,
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
            'uploadedById' => $document->uploaded_by,
            'uploadedDate' => $document->created_at?->toISOString(),
            'version' => $document->version,
            'versionNumber' => $document->version_number,
            'previousVersionId' => $document->previous_version_id,
            'issueDate' => $document->issue_date?->format('Y-m-d'),
            'expiryDate' => $document->expiry_date?->format('Y-m-d'),
            'downloadUrl' => $document->employee_id
                ? url("/api/v1/employees/{$document->employee_id}/documents/{$document->id}/download")
                : url("/api/v1/documents/{$document->id}/download"),
            'isSensitive' => $document->is_sensitive,
        ];
    }
}
