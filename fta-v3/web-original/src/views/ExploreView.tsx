import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Send,
  Share2,
  ShoppingBag,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { CoachProfile, ExplorePost, Product, SectionVisualConfig } from '../types';
import { formatCompactCount, formatToman, toPersianDigits } from '../utils/format';
import { LuxuryArtwork, ProceduralReelVideo } from '../components/VisualMedia';

interface ExploreViewProps {
  posts: ExplorePost[];
  products: Product[];
  coach: CoachProfile;
  bannerConfig?: SectionVisualConfig;
  initialPostId?: string | null;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onAddComment: (postId: string, authorName: string, text: string) => void;
  onSelectProduct: (productId: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  posts,
  products,
  coach,
  bannerConfig,
  initialPostId,
  onToggleLike,
  onToggleSave,
  onAddComment,
  onSelectProduct
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [expandedCaptionId, setExpandedCaptionId] = useState<string | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('ورزشکار مهمان');
  const [commentText, setCommentText] = useState('');
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Scroll to initialPostId if opened from Home preview
  useEffect(() => {
    if (!initialPostId || !containerRef.current) return;
    const idx = posts.findIndex((p) => p.id === initialPostId);
    if (idx >= 0) {
      setActiveIndex(idx);
      const children = containerRef.current.querySelectorAll('[data-reel-index]');
      const target = children[idx] as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [initialPostId, posts]);

  // Pause playback when page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // IntersectionObserver to detect active snapped Reel item
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idxAttr = entry.target.getAttribute('data-reel-index');
            if (idxAttr !== null) {
              const newIndex = Number(idxAttr);
              setActiveIndex(newIndex);
              setIsPlaying(true);
              setVideoProgress(0);
            }
          }
        });
      },
      {
        root,
        threshold: [0.65]
      }
    );

    const items = root.querySelectorAll('[data-reel-index]');
    items.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [posts.length]);

  const handleShare = async (post: ExplorePost) => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://example.test';
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.caption,
          url: shareUrl
        });
        return;
      }
    } catch {
      // Fallback to clipboard
    }

    try {
      await navigator.clipboard.writeText(`${post.title} — ${shareUrl}`);
      setShareToast('لینک پست در حافظه کپی شد');
      setTimeout(() => setShareToast(null), 2400);
    } catch {
      setShareToast('لینک آماده اشتراک‌گذاری است');
      setTimeout(() => setShareToast(null), 2400);
    }
  };

  const handleLikeWithBurst = (postId: string, currentlyLiked: boolean) => {
    onToggleLike(postId);
    if (!currentlyLiked) {
      setHeartBurstId(postId);
      setTimeout(() => setHeartBurstId(null), 700);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentPostId || !commentText.trim()) return;
    onAddComment(activeCommentPostId, commentAuthor.trim() || 'ورزشکار مهمان', commentText.trim());
    setCommentText('');
  };

  const activeCommentPost = posts.find((p) => p.id === activeCommentPostId) || null;

  return (
    <div className="relative w-full h-[100dvh] bg-[#101010] overflow-hidden select-none">
      {/* Share Clipboard Toast */}
      {shareToast && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#1D1D1D] border border-[#C8A66A]/50 text-[#F5F2EC] text-xs font-semibold flex items-center gap-2 shadow-xl"
        >
          <Check className="w-4 h-4 text-[#C8A66A]" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Customizable Explore Intro Banner Overlay */}
      {bannerConfig && bannerConfig.enabled && !bannerDismissed && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-24px)] max-w-[416px] pointer-events-auto">
          <div
            style={
              bannerConfig.bgType === 'solid'
                ? { backgroundColor: bannerConfig.solidColor }
                : undefined
            }
            className="relative overflow-hidden rounded-2xl bg-[#1D1D1D]/90 backdrop-blur-md border border-[#C8A66A]/40 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg"
          >
            {(bannerConfig.bgType === 'image' ||
              bannerConfig.bgType === 'image-overlay') && (
              <div className="absolute inset-0 opacity-35 pointer-events-none">
                <LuxuryArtwork
                  preset={bannerConfig.imagePreset}
                  customUrl={bannerConfig.customImageUrl}
                  displayMode={bannerConfig.imageDisplayMode}
                  alt={bannerConfig.title}
                />
              </div>
            )}
            <div className="relative z-10 min-w-0">
              <div className="text-[11px] font-bold text-[#C8A66A] truncate">
                {bannerConfig.title}
              </div>
              <div className="text-[11px] text-[#F5F2EC]/85 truncate">
                {bannerConfig.subtitle}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="بستن بنر راهنما"
              className="relative z-10 min-h-[32px] min-w-[32px] rounded-lg bg-black/40 text-[#929292] hover:text-[#F5F2EC] flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Screen Vertical Scroll-Snap Reels Feed */}
      <div
        ref={containerRef}
        className="reels-scroll-container no-scrollbar w-full h-full overflow-y-scroll"
      >
        {posts.map((post, idx) => {
          const isCurrentActive = idx === activeIndex;
          const isExpanded = expandedCaptionId === post.id;
          const linkedProduct = post.linkedProductId
            ? products.find((p) => p.id === post.linkedProductId)
            : undefined;
          const currentSlideIdx = carouselIndices[post.id] ?? 0;

          return (
            <section
              key={post.id}
              data-reel-index={idx}
              aria-label={post.title}
              className="reels-snap-item relative w-full h-[100dvh] flex items-center justify-center bg-[#0B0B0B] overflow-hidden"
            >
              {/* Centered 9:16 Viewport Frame on Desktop, Full Edge-to-Edge on Mobile */}
              <div className="relative w-full md:max-w-[440px] h-full bg-[#121212] md:border-x md:border-white/10 overflow-hidden">
                {/* Media Layer */}
                {post.mediaType === 'video' ? (
                  <div className="w-full h-full relative">
                    <ProceduralReelVideo
                      preset={post.visualPreset}
                      customVideoUrl={post.customMediaUrl}
                      isPlaying={isCurrentActive && isPlaying}
                      isMuted={isMuted}
                      bpmTempo={post.bpmTempo}
                      durationSec={post.durationSec || 16}
                      onTogglePlay={() => setIsPlaying((prev) => !prev)}
                      onProgressUpdate={(pct) => {
                        if (isCurrentActive) setVideoProgress(pct);
                      }}
                    />

                    {/* Center Play/Pause Indicator when Paused */}
                    {!isPlaying && isCurrentActive && (
                      <button
                        type="button"
                        onClick={() => setIsPlaying(true)}
                        aria-label="پخش ویدیو"
                        className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 border border-[#C8A66A]/60 text-[#F5F2EC] flex items-center justify-center backdrop-blur-sm z-20 cursor-pointer"
                      >
                        <Play className="w-7 h-7 text-[#C8A66A] fill-[#C8A66A]" />
                      </button>
                    )}

                    {/* Video Progress Bar right above Bottom Nav */}
                    <div className="absolute bottom-16 md:bottom-0 right-0 left-0 h-1 bg-white/15 z-30">
                      <div
                        className="h-full bg-[#C8A66A] transition-all duration-100"
                        style={{ width: `${isCurrentActive ? videoProgress : 0}%` }}
                      />
                    </div>
                  </div>
                ) : post.mediaType === 'carousel' && post.slides && post.slides.length > 0 ? (
                  <div
                    className="w-full h-full relative"
                    style={{ touchAction: 'pan-x pan-y' }}
                  >
                    <LuxuryArtwork
                      preset={post.slides[currentSlideIdx]?.visualPreset || post.visualPreset}
                      customUrl={post.slides[currentSlideIdx]?.customUrl}
                      alt={post.slides[currentSlideIdx]?.slideTitle || post.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Slide Overlay Card */}
                    <div className="absolute top-20 right-4 left-4 p-4 rounded-2xl bg-black/65 backdrop-blur-md border border-[#C8A66A]/35 z-20">
                      <div className="text-xs font-bold text-[#C8A66A]">
                        اسلاید {toPersianDigits(currentSlideIdx + 1)} از{' '}
                        {toPersianDigits(post.slides.length)}
                      </div>
                      <div className="text-sm font-bold text-[#F5F2EC] mt-1">
                        {post.slides[currentSlideIdx]?.slideTitle}
                      </div>
                      <p className="text-xs text-[#F5F2EC]/85 mt-1 leading-relaxed">
                        {post.slides[currentSlideIdx]?.slideNote}
                      </p>
                    </div>

                    {/* Horizontal Carousel Controls */}
                    <div className="absolute inset-y-0 right-2 left-2 flex items-center justify-between pointer-events-none z-20">
                      <button
                        type="button"
                        onClick={() =>
                          setCarouselIndices((prev) => ({
                            ...prev,
                            [post.id]: Math.max(0, currentSlideIdx - 1)
                          }))
                        }
                        disabled={currentSlideIdx === 0}
                        aria-label="اسلاید قبلی"
                        className="pointer-events-auto min-h-[44px] min-w-[44px] rounded-full bg-black/60 border border-white/15 text-[#F5F2EC] disabled:opacity-30 flex items-center justify-center cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCarouselIndices((prev) => ({
                            ...prev,
                            [post.id]: Math.min(
                              (post.slides?.length || 1) - 1,
                              currentSlideIdx + 1
                            )
                          }))
                        }
                        disabled={currentSlideIdx === (post.slides?.length || 1) - 1}
                        aria-label="اسلاید بعدی"
                        className="pointer-events-auto min-h-[44px] min-w-[44px] rounded-full bg-black/60 border border-white/15 text-[#F5F2EC] disabled:opacity-30 flex items-center justify-center cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Carousel Indicators */}
                    <div className="absolute top-[185px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                      {post.slides.map((slide, sIdx) => (
                        <button
                          key={slide.id}
                          type="button"
                          onClick={() =>
                            setCarouselIndices((prev) => ({ ...prev, [post.id]: sIdx }))
                          }
                          aria-label={`رفتن به اسلاید ${toPersianDigits(sIdx + 1)}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            currentSlideIdx === sIdx
                              ? 'w-6 bg-[#C8A66A]'
                              : 'w-2 bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full relative">
                    <LuxuryArtwork
                      preset={post.visualPreset}
                      customUrl={post.customMediaUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Heart Burst Feedback Animation */}
                {heartBurstId === post.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-24 h-24 rounded-full bg-[#C8A66A]/20 flex items-center justify-center animate-ping">
                      <Heart className="w-14 h-14 text-[#C8A66A] fill-[#C8A66A]" />
                    </div>
                  </div>
                )}

                {/* Bottom Readability Gradient Scrim */}
                <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/95 via-black/65 to-transparent pointer-events-none z-10" />

                {/* Vertical Action Toolbar (Positioned on Left side in RTL so thumb can tap easily while Caption sits on Right) */}
                <div className="absolute left-3 bottom-24 md:bottom-8 z-30 flex flex-col items-center gap-3">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={() => handleLikeWithBurst(post.id, post.isLiked)}
                    aria-label={post.isLiked ? 'لغو پسندیدن' : 'پسندیدن'}
                    className="min-h-[48px] min-w-[48px] flex flex-col items-center justify-center cursor-pointer group"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors ${
                        post.isLiked
                          ? 'bg-[#C8A66A]/25 border-[#C8A66A] text-[#C8A66A]'
                          : 'bg-black/50 border-white/15 text-[#F5F2EC] group-hover:border-[#C8A66A]/50'
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 ${post.isLiked ? 'fill-[#C8A66A] text-[#C8A66A]' : ''}`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#F5F2EC] mt-1 tabular-nums">
                      {formatCompactCount(post.likesCount)}
                    </span>
                  </button>

                  {/* Comments Trigger */}
                  <button
                    type="button"
                    onClick={() => setActiveCommentPostId(post.id)}
                    aria-label="مشاهده و ثبت دیدگاه"
                    className="min-h-[48px] min-w-[48px] flex flex-col items-center justify-center cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-full bg-black/50 border border-white/15 group-hover:border-[#C8A66A]/50 text-[#F5F2EC] flex items-center justify-center backdrop-blur-md transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#F5F2EC] mt-1 tabular-nums">
                      {toPersianDigits(post.comments.length)}
                    </span>
                  </button>

                  {/* Save / Bookmark Trigger */}
                  <button
                    type="button"
                    onClick={() => onToggleSave(post.id)}
                    aria-label={post.isSaved ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره پست'}
                    className="min-h-[48px] min-w-[48px] flex flex-col items-center justify-center cursor-pointer group"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors ${
                        post.isSaved
                          ? 'bg-[#C8A66A]/25 border-[#C8A66A] text-[#C8A66A]'
                          : 'bg-black/50 border-white/15 text-[#F5F2EC] group-hover:border-[#C8A66A]/50'
                      }`}
                    >
                      <Bookmark
                        className={`w-5 h-5 ${post.isSaved ? 'fill-[#C8A66A] text-[#C8A66A]' : ''}`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#F5F2EC] mt-1">
                      {post.isSaved ? 'ذخیره شد' : 'ذخیره'}
                    </span>
                  </button>

                  {/* Share Trigger */}
                  <button
                    type="button"
                    onClick={() => handleShare(post)}
                    aria-label="اشتراک‌گذاری پست"
                    className="min-h-[48px] min-w-[48px] flex flex-col items-center justify-center cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-full bg-black/50 border border-white/15 group-hover:border-[#C8A66A]/50 text-[#F5F2EC] flex items-center justify-center backdrop-blur-md transition-colors">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium text-[#F5F2EC] mt-1">ارسال</span>
                  </button>

                  {/* Video Play/Pause & Mute/Unmute Controls */}
                  {post.mediaType === 'video' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsMuted((prev) => !prev)}
                        aria-label={isMuted ? 'وصل صدای ویدیو' : 'قطع صدای ویدیو'}
                        className="min-h-[44px] min-w-[44px] rounded-full bg-black/60 border border-white/15 text-[#F5F2EC] flex items-center justify-center backdrop-blur-md cursor-pointer"
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-[#929292]" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-[#C8A66A]" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPlaying((prev) => !prev)}
                        aria-label={isPlaying ? 'توقف ویدیو' : 'پخش ویدیو'}
                        className="min-h-[44px] min-w-[44px] rounded-full bg-black/60 border border-white/15 text-[#F5F2EC] flex items-center justify-center backdrop-blur-md cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 text-[#C8A66A]" />
                        ) : (
                          <Play className="w-4 h-4 text-[#C8A66A]" />
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Author Info, Expandable Caption, and Linked Product CTA (Bottom Right, clearing BottomNav) */}
                <div className="absolute right-4 left-20 bottom-20 md:bottom-6 z-20 text-right">
                  {/* Coach Identity Line */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-[#C8A66A] shrink-0">
                      <LuxuryArtwork preset={coach.visualPreset} alt={coach.name} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#F5F2EC] leading-none">
                        {coach.name}
                      </div>
                      <div className="text-[11px] text-[#C8A66A] mt-1">
                        {post.createdAt} · {formatCompactCount(post.viewsCount)} بازدید
                      </div>
                    </div>
                  </div>

                  {/* Post Title & Expandable Caption */}
                  <h2 className="text-sm sm:text-base font-bold text-[#F5F2EC] leading-snug">
                    {post.title}
                  </h2>

                  <div className="mt-1.5">
                    <p
                      className={`text-xs text-[#F5F2EC]/85 leading-relaxed ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}
                    >
                      {post.caption}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCaptionId(isExpanded ? null : post.id)
                      }
                      className="text-[11px] font-semibold text-[#C8A66A] mt-1 cursor-pointer"
                    >
                      {isExpanded ? 'بستن توضیحات' : 'بیشتر بخوانید...'}
                    </button>
                  </div>

                  {/* Clean Unboxed Hashtags */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#929292] mt-2">
                    {post.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>

                  {/* Linked Product CTA Card */}
                  {linkedProduct && (
                    <button
                      type="button"
                      onClick={() => onSelectProduct(linkedProduct.id)}
                      className="mt-3 w-full p-2.5 rounded-2xl bg-[#1D1D1D]/95 hover:bg-[#262626] border border-[#C8A66A]/45 flex items-center justify-between gap-3 backdrop-blur-md transition-colors cursor-pointer text-right"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <LuxuryArtwork
                            preset={linkedProduct.visualPreset}
                            customUrl={linkedProduct.customImageUrl}
                            alt={linkedProduct.title}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] text-[#C8A66A] font-semibold">
                            محصول مرتبط با این آموزش
                          </div>
                          <div className="text-xs font-bold text-[#F5F2EC] truncate">
                            {linkedProduct.title}
                          </div>
                          <div className="text-[11px] text-[#929292] tabular-nums">
                            {formatToman(linkedProduct.price)}
                          </div>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-[#C8A66A] text-[#101010] flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Scrollable Bottom Sheet for Comments */}
      {activeCommentPost && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="دیدگاه‌های پست"
          onClick={() => setActiveCommentPostId(null)}
        >
          <div
            className="w-full max-w-md bg-[#1D1D1D] border-t border-white/15 rounded-t-3xl max-h-[78dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle & Sheet Header */}
            <div className="pt-3 pb-3 px-5 border-b border-white/[0.08]">
              <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#F5F2EC]">
                  دیدگاه‌ها ({toPersianDigits(activeCommentPost.comments.length)})
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveCommentPostId(null)}
                  aria-label="بستن دیدگاه‌ها"
                  className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-[#929292] hover:text-[#F5F2EC] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeCommentPost.comments.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#929292]">
                  هنوز دیدگاهی ثبت نشده است. اولین نفر باشید!
                </div>
              ) : (
                activeCommentPost.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3.5 rounded-2xl border ${
                      comment.isCoachReply
                        ? 'bg-[#C8A66A]/10 border-[#C8A66A]/35 mr-4'
                        : 'bg-[#141414] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#F5F2EC]">
                          {comment.authorName}
                        </span>
                        {comment.authorRole && (
                          <>
                            <span aria-hidden="true" className="text-[#929292]">
                              ·
                            </span>
                            <span className="text-[#C8A66A] text-[11px]">
                              {comment.authorRole}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-[11px] text-[#929292]">
                        {comment.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-[#F5F2EC]/90 mt-2 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Demo Comment Form */}
            <form
              onSubmit={handleCommentSubmit}
              className="p-4 bg-[#141414] border-t border-white/[0.08] space-y-2.5 pb-safe"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="نام شما"
                  aria-label="نام نویسنده دیدگاه"
                  className="w-32 px-3 py-2 rounded-xl bg-[#1D1D1D] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                />
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="پرسش یا دیدگاه خود را بنویسید..."
                  aria-label="متن دیدگاه"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#1D1D1D] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                />
                <button
                  type="submit"
                  aria-label="ارسال دیدگاه"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
