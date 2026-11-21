<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\BrandSetting;
use App\Models\ExplorePost;
use App\Models\PostComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PostInteractionController
{
    /**
     * Toggle or increment like count on an Explore / Reels post.
     */
    public function toggleLike(Request $request, string $postId): JsonResponse
    {
        $post = ExplorePost::find($postId);
        if (! $post) {
            return response()->json([
                'error' => 'پست مورد نظر یافت نشد.',
                'code' => 'POST_NOT_FOUND',
            ], 404);
        }

        $direction = (string) $request->input('direction', 'like');
        if (! in_array($direction, ['like', 'unlike'], true)) {
            return response()->json([
                'error' => 'نوع تعامل معتبر نیست.',
                'code' => 'INVALID_LIKE_DIRECTION',
            ], 422);
        }

        $cookieName = 'wl_post_like_' . substr(hash('sha256', $post->id), 0, 24);
        $alreadyLiked = $request->cookie($cookieName) === '1';
        $shouldMutate = ($direction === 'like' && ! $alreadyLiked)
            || ($direction === 'unlike' && $alreadyLiked);

        DB::transaction(function () use ($post, $direction, $shouldMutate) {
            $locked = ExplorePost::where('id', $post->id)->lockForUpdate()->first();
            if (! $locked) {
                return;
            }
            if (! $shouldMutate) {
                $post->likes_count = $locked->likes_count;

                return;
            }
            $current = (int) $locked->likes_count;
            $locked->likes_count = $direction === 'unlike'
                ? max(0, $current - 1)
                : $current + 1;
            $locked->save();
            $post->likes_count = $locked->likes_count;
        });

        $response = response()->json([
            'ok' => true,
            'postId' => $post->id,
            'likesCount' => (int) $post->likes_count,
        ]);

        if ($direction === 'like') {
            return $response->cookie(
                $cookieName,
                '1',
                525_600,
                '/',
                null,
                $request->isSecure(),
                true,
                false,
                'lax'
            );
        }

        return $response->withoutCookie($cookieName, '/');
    }

    /**
     * Public comment submission on an Explore / Reels post.
     *
     * SECURITY & MODERATION RULE (Section 7):
     * Publicly submitted comments default to `approved = false` when comment moderation
     * is active (default), ensuring pending comments NEVER leak to public visitors
     * until explicitly approved by the coach in the Admin Panel.
     */
    public function storeComment(Request $request, string $postId): JsonResponse
    {
        $post = ExplorePost::find($postId);
        if (! $post) {
            return response()->json([
                'error' => 'پست مورد نظر یافت نشد.',
                'code' => 'POST_NOT_FOUND',
            ], 404);
        }

        $validated = $request->validate([
            'authorName' => ['required', 'string', 'min:2', 'max:80'],
            'text' => ['required', 'string', 'min:2', 'max:1000'],
        ]);

        $brand = BrandSetting::first();
        $siteModules = is_array($brand?->site_modules) ? $brand->site_modules : [];
        $moderationEnabled = (bool) ($siteModules['commentsModeration'] ?? true);

        $comment = PostComment::create([
            'id' => 'cmt-' . Str::lower(Str::random(12)),
            'post_id' => $post->id,
            'author_name' => strip_tags(trim((string) $validated['authorName'])),
            'author_role' => 'ورزشکار',
            'text' => strip_tags(trim((string) $validated['text'])),
            'is_coach_reply' => false,
            'approved' => ! $moderationEnabled,
        ]);

        return response()->json([
            'ok' => true,
            'moderationRequired' => $moderationEnabled,
            'message' => $moderationEnabled
                ? 'دیدگاه شما ثبت شد و پس از تایید مربی نمایش داده خواهد شد.'
                : 'دیدگاه شما با موفقیت منتشر شد.',
            'comment' => [
                'id' => $comment->id,
                'postId' => $comment->post_id,
                'authorName' => $comment->author_name,
                'text' => $comment->text,
                'approved' => (bool) $comment->approved,
                'createdAt' => 'هم‌اکنون',
            ],
        ], 201);
    }

    /**
     * Dedicated Admin Comment Moderation (Approve / Reject / Coach Reply).
     */
    public function moderateComment(Request $request, string $postId, string $commentId): JsonResponse
    {
        $comment = PostComment::where('post_id', $postId)->where('id', $commentId)->first();
        if (! $comment) {
            return response()->json([
                'error' => 'دیدگاه مورد نظر یافت نشد.',
                'code' => 'COMMENT_NOT_FOUND',
            ], 404);
        }

        $validated = $request->validate([
            'approved' => ['required', 'boolean'],
            'text' => ['nullable', 'string', 'max:1000'],
        ]);

        $comment->approved = (bool) $validated['approved'];
        if (array_key_exists('text', $validated) && $validated['text'] !== null && trim((string) $validated['text']) !== '') {
            $comment->text = strip_tags(trim((string) $validated['text']));
        }
        $comment->save();

        return response()->json([
            'ok' => true,
            'comment' => [
                'id' => $comment->id,
                'postId' => $comment->post_id,
                'authorName' => $comment->author_name,
                'text' => $comment->text,
                'approved' => (bool) $comment->approved,
            ],
        ]);
    }

    /**
     * Dedicated Admin Comment Deletion.
     */
    public function destroyComment(string $postId, string $commentId): JsonResponse
    {
        $deleted = PostComment::where('post_id', $postId)->where('id', $commentId)->delete();
        if (! $deleted) {
            return response()->json([
                'error' => 'دیدگاه مورد نظر یافت نشد.',
                'code' => 'COMMENT_NOT_FOUND',
            ], 404);
        }

        return response()->json([
            'ok' => true,
            'deletedCommentId' => $commentId,
            'postId' => $postId,
        ]);
    }
}
