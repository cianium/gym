<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.productId' => ['required', 'string', 'max:64'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:50'],
            'customer' => ['required', 'array'],
            'customer.name' => ['required', 'string', 'min:2', 'max:120'],
            'customer.phone' => ['required', 'string', 'regex:/^09\d{9}$/'],
            'customer.email' => ['nullable', 'email', 'max:190'],
            'customer.city' => ['nullable', 'string', 'max:80'],
            'customer.address' => ['nullable', 'string', 'max:500'],
            'customer.postalCode' => ['nullable', 'string', 'max:24'],
            'customer.notes' => ['nullable', 'string', 'max:500'],
            'gateway' => ['required', 'string', 'in:zarinpal,sep'],
            'discountCode' => ['nullable', 'string', 'max:40'],
            'idempotencyKey' => ['nullable', 'string', 'max:120'],
        ];
    }
}
