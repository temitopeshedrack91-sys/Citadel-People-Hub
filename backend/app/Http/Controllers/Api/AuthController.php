<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:4096'],
            'device_name' => ['sometimes', 'string', 'max:100'],
        ]);

        $provider = Auth::guard('web')->getProvider();
        $user = $provider->retrieveByCredentials([
            'email' => strtolower($credentials['email']),
            'is_active' => true,
        ]);

        if (! $user || ! $provider->validateCredentials($user, ['password' => $credentials['password']])) {
            throw ValidationException::withMessages(['email' => ['The provided credentials are invalid.']]);
        }

        $token = $user->createToken($credentials['device_name'] ?? 'citadel-people-hub')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userData($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userData($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    private function userData($user): array
    {
        $user->loadMissing(['entity', 'department']);
        $employee = $user->staff_id
            ? Employee::query()->with(['entity', 'department'])->where('staff_id', $user->staff_id)->first()
            : null;

        return [
            'id' => (string) ($employee?->id ?? $user->id),
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'staffId' => $user->staff_id,
            'entityId' => $user->entity_id ?? $employee?->entity_id,
            'entityName' => $user->entity?->name ?? $employee?->entity?->name,
            'departmentId' => $user->department_id ?? $employee?->department_id,
            'departmentName' => $user->department?->name ?? $employee?->department?->name,
            'jobTitle' => $user->job_title ?? $employee?->job_title,
        ];
    }
}
