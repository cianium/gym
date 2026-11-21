<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StateSyncRequest extends FormRequest
{
    public const SUPPORTED_KEYS = [
        'coach',
        'brandConfig',
        'siteModules',
        'themeColors',
        'sectionConfigs',
        'products',
        'posts',
        'orders',
        'consultations',
        'discounts',
        'discountCodes',
        'deletedProductIds',
        'deletedPostIds',
        'deletedSectionIds',
    ];

    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'coach' => ['sometimes', 'array', 'max:80'],
            'brandConfig' => ['sometimes', 'array', 'max:80'],
            'siteModules' => ['sometimes', 'array', 'max:80'],
            'themeColors' => ['sometimes', 'array', 'max:80'],
            'sectionConfigs' => ['sometimes', 'array', 'max:200'],
            'products' => ['sometimes', 'array', 'max:500'],
            'posts' => ['sometimes', 'array', 'max:500'],
            'orders' => ['sometimes', 'array', 'max:500'],
            'consultations' => ['sometimes', 'array', 'max:500'],
            'discounts' => ['sometimes', 'array', 'max:500'],
            'discountCodes' => ['sometimes', 'array', 'max:500'],
            'deletedProductIds' => ['sometimes', 'array', 'max:500'],
            'deletedProductIds.*' => ['string', 'max:64'],
            'deletedPostIds' => ['sometimes', 'array', 'max:500'],
            'deletedPostIds.*' => ['string', 'max:64'],
            'deletedSectionIds' => ['sometimes', 'array', 'max:500'],
            'deletedSectionIds.*' => ['string', 'max:64'],
        ];
    }

    private function containsDataUrl(mixed $value): bool
    {
        if (is_string($value)) {
            $trimmed = strtolower(trim($value));

            return str_starts_with($trimmed, 'data:image/') || str_starts_with($trimmed, 'data:application/');
        }
        if (is_array($value)) {
            foreach ($value as $child) {
                if ($this->containsDataUrl($child)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function exceedsStructuralLimits(mixed $value, int $depth = 0): bool
    {
        if ($depth > 12) {
            return true;
        }

        if (is_string($value)) {
            return mb_strlen($value) > 100_000;
        }

        if (is_array($value)) {
            if (count($value) > 1_000) {
                return true;
            }
            foreach ($value as $child) {
                if ($this->exceedsStructuralLimits($child, $depth + 1)) {
                    return true;
                }
            }
        }

        return false;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $allInput = $this->all();
            $inputKeys = array_keys($allInput);
            if (empty($inputKeys)) {
                $validator->errors()->add('payload', 'هیچ داده معتبری برای ذخیره‌سازی ارسال نشده است.');

                return;
            }

            $unsupported = array_diff($inputKeys, self::SUPPORTED_KEYS);
            if (! empty($unsupported)) {
                $validator->errors()->add(
                    'unsupported_fields',
                    'فیلدهای ناشناخته یا پشتیبانی‌نشده ارسال شده‌اند: ' . implode(', ', $unsupported)
                );
            }

            if ($this->containsDataUrl($allInput)) {
                $validator->errors()->add(
                    'base64_media',
                    'ذخیره مستقیم تصاویر Base64 (Data URL) در دیتابیس مجاز نیست. لطفاً فایل تصویر را از طریق API رسانه (/api/v1/admin/media) آپلود کنید.'
                );
            }

            if ($this->exceedsStructuralLimits($allInput)) {
                $validator->errors()->add(
                    'payload_limits',
                    'ساختار داده بیش از حد بزرگ یا تو در تو است. داده‌ها را در درخواست‌های کوچک‌تر ارسال کنید.'
                );
            }
        });
    }
}


