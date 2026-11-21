<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InstallSystemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $headerToken = trim((string) ($this->header('X-Setup-Token') ?: $this->header('X-Installer-Token', '')));
        if (! $this->filled('setupToken') && $headerToken !== '') {
            $this->merge(['setupToken' => $headerToken]);
        }
    }

    public function rules(): array
    {
        return [
            'brandName' => ['required', 'string', 'min:2', 'max:120', 'not_regex:/[\x00-\x1F\x7F]/u'],
            'brandSubtitle' => ['nullable', 'string', 'max:255', 'not_regex:/[\x00-\x1F\x7F]/u'],
            'canonicalDomain' => ['nullable', 'url', 'max:190'],
            'coachName' => ['required', 'string', 'min:2', 'max:120', 'not_regex:/[\x00-\x1F\x7F]/u'],
            'adminUsername' => ['required', 'string', 'min:3', 'max:60', 'regex:/^[A-Za-z0-9_.-]+$/'],
            'adminEmail' => ['required', 'email', 'max:190'],
            'adminPhone' => ['nullable', 'string', 'max:30'],
            'adminPassword' => [
                'required',
                'string',
                'min:8',
                'max:255',
                Rule::notIn(['Coach@1403', 'coach@1403', '12345678', 'password', 'admin123']),
            ],
            'dbConnection' => ['sometimes', 'string', 'in:mysql,sqlite'],
            'dbHost' => ['sometimes', 'string', 'max:120', 'regex:/^[A-Za-z0-9_.:-]+$/'],
            'dbPort' => ['sometimes', 'string', 'max:5', 'regex:/^\d{1,5}$/'],
            'dbName' => ['sometimes', 'string', 'max:255', 'regex:/^[A-Za-z0-9_$.-]+$/'],
            'dbUser' => ['sometimes', 'string', 'max:120', 'regex:/^[A-Za-z0-9_$.-]+$/'],
            'dbPass' => ['nullable', 'string', 'max:255', 'not_regex:/[\x00\r\n]/'],
            'zarinpalMerchantId' => ['nullable', 'string', 'max:120', 'regex:/^[A-Za-z0-9-]*$/'],
            'sepTerminalId' => ['nullable', 'string', 'max:120', 'regex:/^[A-Za-z0-9-]*$/'],
            'setupToken' => ['nullable', 'string', 'max:255'],
            'documentRoot' => ['nullable', 'string', 'max:255'],
            'writeEnvInTests' => ['sometimes', 'boolean'],
        ];
    }
}
