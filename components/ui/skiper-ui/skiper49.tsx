"use client";

import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import React from "react";
import {
  Autoplay,
  EffectCoverflow,
  Navigation,
  Pagination,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css";

import { cn } from "@/lib/utils";

const Skiper49 = () => {
  const images = [
    {
      src: "/images/x.com/13.jpeg",
      alt: "Illustration",
    },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-[#f5f4f3]">
      <Carousel_003 className="" images={images} showPagination loop />
    </div>
  );
};

interface CarouselImage {
  src: string;
  alt: string;
  id?: number | string;
  title?: string;
  logo?: string;
  media_type?: string;
  onClick?: () => void;
}

const Carousel_003 = ({
  images,
  className,
  showPagination = false,
  showNavigation = false,
  loop = true,
  autoplay = false,
  spaceBetween = 0,
  onItemClick,
  onSlideChange,
}: {
  images: CarouselImage[];
  className?: string;
  showPagination?: boolean;
  showNavigation?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  spaceBetween?: number;
  onItemClick?: (image: CarouselImage) => void;
  onSlideChange?: (index: number) => void;
}) => {
  const css = `
  .Carousal_003 {
    width: 100%;
    height: 100%;
    padding-bottom: 30px !important;
  }
  
  .Carousal_003 .swiper-slide {
    background-position: center;
    background-size: cover;
    width: 320px;
    height: 480px;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  @media (min-width: 768px) {
    .Carousal_003 .swiper-slide {
      width: 420px;
      height: 600px;
    }
  }

  .swiper-pagination-bullet {
    background-color: #fff !important;
    opacity: 0.5;
  }

  .swiper-pagination-bullet-active {
    background-color: #ef4444 !important;
    opacity: 1;
    width: 20px;
    border-radius: 4px;
  }
`;
  
  let finalImages = images;
  if (loop && images.length > 0 && images.length < 8) {
    while (finalImages.length < 8) {
      finalImages = [...finalImages, ...images];
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.1,
      }}
      className={cn("relative w-full overflow-visible", className)}
    >
      <style>{css}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full overflow-visible"
      >
        <Swiper
          spaceBetween={spaceBetween}
          autoplay={
            autoplay
              ? {
                  delay: 4000,
                  disableOnInteraction: false,
                }
              : false
          }
          effect="coverflow"
          grabCursor={true}
          slidesPerView="auto"
          centeredSlides={true}
          loop={loop && finalImages.length >= 8}
          coverflowEffect={{
            rotate: 20,
            stretch: 0,
            depth: 150,
            modifier: 1,
            slideShadows: true,
          }}
          pagination={
            showPagination
              ? {
                  clickable: true,
                }
              : false
          }
          navigation={
            showNavigation
              ? {
                  nextEl: ".swiper-button-next",
                  prevEl: ".swiper-button-prev",
                }
              : false
          }
          className="Carousal_003 overflow-visible"
          modules={[EffectCoverflow, Autoplay, Pagination, Navigation]}
          onSlideChange={(swiper) => onSlideChange && onSlideChange(swiper.realIndex % (images.length || 1))}
        >
          {finalImages.map((image, index) => (
            <SwiperSlide 
              key={index} 
              className="relative group cursor-pointer"
              onClick={() => onItemClick && onItemClick(image)}
            >
              <img
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                src={image.src}
                alt={image.alt}
                loading="lazy"
                decoding="async"
              />
              {/* Bottom text overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent opacity-90 flex flex-col justify-end p-6">
                {image.logo ? (
                  <img src={image.logo} alt={image.title} className="h-10 w-auto object-contain self-start mb-2" />
                ) : (
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
                    {image.title}
                  </h3>
                )}
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {image.alt}
                </p>
              </div>
            </SwiperSlide>
          ))}
          {showNavigation && (
            <div>
              <button className="swiper-button-next after:hidden absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/60 hover:bg-black/80 w-12 h-12 rounded-full flex items-center justify-center border border-white/10 transition-all">
                <ChevronRightIcon className="h-6 w-6 text-white" />
              </button>
              <button className="swiper-button-prev after:hidden absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/60 hover:bg-black/80 w-12 h-12 rounded-full flex items-center justify-center border border-white/10 transition-all">
                <ChevronLeftIcon className="h-6 w-6 text-white" />
              </button>
            </div>
          )}
        </Swiper>
      </motion.div>
    </motion.div>
  );
};

export { Skiper49, Carousel_003 };
