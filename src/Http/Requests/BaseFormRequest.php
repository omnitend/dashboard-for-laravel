<?php

namespace OmniTend\LaravelDashboard\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

/**
 * Base form request class that provides consistent validation error responses
 * for use with the frontend form components.
 */
abstract class BaseFormRequest extends FormRequest
{
    /**
     * Handle a failed validation attempt.
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    protected function failedValidation(Validator $validator): void
    {
        if ($this->expectsJson()) {
            throw new HttpResponseException(
                response()->json([
                    'message' => $this->getValidationMessage($validator),
                    'errors' => $validator->errors()->toArray(),
                ], 422)
            );
        }

        parent::failedValidation($validator);
    }

    /**
     * Get the validation error message.
     *
     * Override this method to customize the error message.
     */
    protected function getValidationMessage(Validator $validator): string
    {
        return 'The given data was invalid.';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Override this method in child classes to define validation rules.
     */
    abstract public function rules(): array;

    /**
     * Determine if the user is authorized to make this request.
     *
     * IMPORTANT: This method is intentionally NOT implemented here.
     * You MUST override this method in your form request classes.
     *
     * Laravel's default is to return false for security.
     * Explicitly return true for public endpoints or implement authorization logic.
     *
     * Example:
     * public function authorize(): bool
     * {
     *     return true; // For public endpoints
     *     // OR
     *     return $this->user()->can('update', $this->route('product'));
     * }
     */
    // Note: authorize() is NOT defined here - use Laravel's secure default (returns false)
}
