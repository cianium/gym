<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\BrandSetting;
use App\Models\CoachProfile;
use App\Models\Product;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! BrandSetting::exists()) {
            BrandSetting::create([
                'brand_name' => 'پلتفرم White-Label مربی ورزشی',
                'brand_subtitle' => 'سیستم جامع برنامه‌های تمرینی و تجهیزات تخصصی',
                'seo_title' => 'پلتفرم رسمی مربیگری و برنامه‌های تمرینی',
                'seo_description' => 'برنامه‌های تمرینی علمی و تجهیزات ورزشی اورجینال',
                'canonical_domain' => 'https://coach-domain.ir',
                'footer_copyright' => 'تمامی حقوق محفوظ است.',
                'shipping_flat_rate_toman' => 85000,
                'free_shipping_threshold_toman' => 3000000,
                'theme_tokens' => [
                    'primaryColor' => '#C8A66A',
                    'secondaryColor' => '#D6B77D',
                ],
                'site_modules' => [
                    'digitalPrograms' => true,
                    'physicalShop' => true,
                    'exploreReels' => true,
                    'coachingRequests' => true,
                    'nfcSmartCard' => true,
                    'commentsModeration' => true,
                    'discounts' => true,
                ],
            ]);
        }

        if (! CoachProfile::exists()) {
            CoachProfile::create([
                'name' => 'آرش کاظمی',
                'english_name' => 'Arash Kazemi',
                'title' => 'مربی تخصصی هایپرتروفی و عملکرد ورزشی',
                'tagline' => 'طراحی علمی تمرین بر اساس بیومکانیک فردی',
                'bio' => 'بیش از ۱۲ سال سابقه مربیگری تخصصی.',
                'specialties' => ['هایپرتروفی', 'پاورلیفتینگ', 'تغذیه ورزشی'],
                'experience_years' => 12,
                'active_athletes' => 840,
                'programs_delivered' => 3200,
                'certifications' => [],
            ]);
        }

        Product::updateOrCreate(
            ['id' => 'prod-digital-hypertrophy'],
            [
                'slug' => 'pro-hypertrophy-12w',
                'type' => 'digital',
                'title' => 'پروتکل ۱۲ هفته‌ای هایپرتروفی پیشرفته',
                'subtitle' => 'برنامه جامع دوره‌بندی‌شده با دفترچه ثبت رکورد و راهنمای تغذیه',
                'price_toman' => 1890000,
                'discount_price_toman' => 1490000,
                'description' => 'پروتکل کامل ۱۲ هفته‌ای مخصوص ورزشکاران سطح متوسط تا پیشرفته.',
                'features' => ['دفترچه PDF تعاملی', 'ویدیوهای آموزش تکنیک', 'ماشین‌حساب ماکرو'],
                'visual_preset' => 'digital-hypertrophy',
                'status' => 'published',
                'private_file_path' => 'prod-digital-hypertrophy.pdf',
            ]
        );
    }
}
