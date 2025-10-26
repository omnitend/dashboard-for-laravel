<?php

namespace OmniTend\LaravelDashboard\Traits;

use Illuminate\Http\JsonResponse;

/**
 * Trait for consistent API responses across controllers.
 */
trait HasApiResponses
{
    /**
     * Return a success response.
     */
    protected function success(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        $response = ['message' => $message];

        if ($data !== null) {
            $response['data'] = $data;
        }

        return response()->json($response, $status);
    }

    /**
     * Return an error response.
     */
    protected function error(string $message = 'Error', int $status = 400, array $errors = []): JsonResponse
    {
        $response = ['message' => $message];

        if (!empty($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }

    /**
     * Return a validation error response.
     */
    protected function validationError(array $errors, string $message = 'Validation failed'): JsonResponse
    {
        return $this->error($message, 422, $errors);
    }

    /**
     * Return a not found response.
     */
    protected function notFound(string $message = 'Resource not found'): JsonResponse
    {
        return $this->error($message, 404);
    }

    /**
     * Return an unauthorized response.
     */
    protected function unauthorized(string $message = 'Unauthorized'): JsonResponse
    {
        return $this->error($message, 401);
    }

    /**
     * Return a forbidden response.
     */
    protected function forbidden(string $message = 'Forbidden'): JsonResponse
    {
        return $this->error($message, 403);
    }
}
