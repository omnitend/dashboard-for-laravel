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
     * Determine if the user is authorized to make this request.
     *
     * Override this method in child classes for authorization logic.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Override this method in child classes to define validation rules.
     */
    abstract public function rules(): array;
}
