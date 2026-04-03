import React, { useEffect, useRef } from 'react';
import { useUI } from '../contexts/UIContext';

export const PremiumBackground: React.FC = () => {
    const { theme, accentColor } = useUI();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!theme.includes('particle')) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: any[] = [];
        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Initialization based on specific particle theme
        if (theme === 'premium-particles-galaxy') {
            for (let i = 0; i < 200; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 1.5,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    alpha: Math.random(),
                });
            }
        } else if (theme === 'premium-particles-moon') {
            for (let i = 0; i < 200; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 1.5,
                    alpha: Math.random(),
                    twinkleSpeed: 0.005 + Math.random() * 0.02,
                    vx: (Math.random() - 0.5) * 0.1,
                    vy: (Math.random() - 0.5) * 0.1,
                });
            }
            // Shooting star tracker
            particles.push({ isShootingStar: true, active: false, x: 0, y: 0, length: 0, vx: 0, vy: 0, life: 0, maxLife: 0 });
        } else if (theme === 'premium-particles-stardust') {
            for (let i = 0; i < 100; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 2 + 0.5,
                    vy: -Math.random() * 1 - 0.5,
                    alpha: Math.random() * 0.5 + 0.5,
                });
            }
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (theme === 'premium-particles-moon') {
                // Responsive Moon Position
                const isMobile = canvas.width < 768;
                const moonX = isMobile ? canvas.width * 0.5 : canvas.width * 0.82;
                const moonY = isMobile ? canvas.height * 0.15 : canvas.height * 0.22;
                const moonRadius = isMobile ? canvas.width * 0.18 : Math.min(canvas.width, canvas.height) * 0.1;

                ctx.save();

                // 1. Cinematic Atmospheric Glow (The "Moonlight" Aura)
                const atmosphericGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 1, moonX, moonY, moonRadius * 6);
                atmosphericGlow.addColorStop(0, 'rgba(148, 163, 184, 0.2)');
                atmosphericGlow.addColorStop(0.3, 'rgba(30, 41, 59, 0.1)');
                atmosphericGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.beginPath();
                ctx.arc(moonX, moonY, moonRadius * 6, 0, Math.PI * 2);
                ctx.fillStyle = atmosphericGlow;
                ctx.fill();

                // 2. Secondary Atmospheric Nebula (Cool Blues/Purples)
                const nebulaGlow = ctx.createRadialGradient(moonX - moonRadius * 2, moonY + moonRadius * 2, 0, moonX, moonY, moonRadius * 8);
                nebulaGlow.addColorStop(0, 'rgba(15, 23, 42, 0.15)');
                nebulaGlow.addColorStop(0.5, 'rgba(88, 28, 135, 0.05)');
                nebulaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.beginPath();
                ctx.arc(moonX, moonY, moonRadius * 8, 0, Math.PI * 2);
                ctx.fillStyle = nebulaGlow;
                ctx.fill();

                // 3. Moon Body (High-End 3D Rendering)
                const moonGradient = ctx.createRadialGradient(
                    moonX - moonRadius * 0.35, moonY - moonRadius * 0.35, moonRadius * 0.05,
                    moonX, moonY, moonRadius
                );
                moonGradient.addColorStop(0, '#ffffff');
                moonGradient.addColorStop(0.6, '#f1f5f9');
                moonGradient.addColorStop(0.85, '#cbd5e1');
                moonGradient.addColorStop(1, '#94a3b8');

                ctx.beginPath();
                ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
                ctx.fillStyle = moonGradient;
                ctx.shadowBlur = 60;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();

                // 4. Detailed Craters (Organic Shadows)
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
                const craters = [
                    { x: -0.4, y: 0.15, r: 0.22 },
                    { x: 0.25, y: -0.4, r: 0.18 },
                    { x: 0.35, y: 0.35, r: 0.25 },
                    { x: -0.1, y: -0.2, r: 0.12 },
                    { x: 0.1, y: 0.5, r: 0.15 }
                ];
                craters.forEach(c => {
                    ctx.beginPath();
                    ctx.arc(moonX + moonRadius * c.x, moonY + moonRadius * c.y, moonRadius * c.r, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.restore();
            }

            particles.forEach((p) => {
                if (theme === 'premium-particles-moon' && p.isShootingStar) {
                    if (!p.active) {
                        if (Math.random() < 0.003) {
                            p.active = true;
                            p.x = Math.random() * canvas.width;
                            p.y = Math.random() * (canvas.height * 0.5);
                            p.length = 80 + Math.random() * 150;
                            p.vx = 8 + Math.random() * 12;
                            p.vy = 4 + Math.random() * 8;
                            p.life = 0;
                            p.maxLife = 50 + Math.random() * 50;
                        }
                    } else {
                        p.x -= p.vx;
                        p.y += p.vy;
                        p.life++;

                        const opacity = Math.sin((p.life / p.maxLife) * Math.PI) * 0.8;
                        if (p.life >= p.maxLife || p.x < 0 || p.y > canvas.height) {
                            p.active = false;
                        } else {
                            const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.length, p.y - p.length * 0.5);
                            grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
                            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p.x + p.length, p.y - p.length * 0.5);
                            ctx.strokeStyle = grad;
                            ctx.lineWidth = 1.5;
                            ctx.stroke();
                        }
                    }
                    return;
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

                if (theme === 'premium-particles-galaxy') {
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < 0) p.x = canvas.width;
                    if (p.x > canvas.width) p.x = 0;
                    if (p.y < 0) p.y = canvas.height;
                    if (p.y > canvas.height) p.y = 0;
                } else if (theme === 'premium-particles-moon') {
                    p.alpha += p.twinkleSpeed;
                    if (p.alpha > 0.8 || p.alpha < 0.2) p.twinkleSpeed = -p.twinkleSpeed;

                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < 0) p.x = canvas.width;
                    if (p.x > canvas.width) p.x = 0;
                    if (p.y < 0) p.y = canvas.height;
                    if (p.y > canvas.height) p.y = 0;

                    ctx.fillStyle = `rgba(148, 163, 184, ${Math.abs(p.alpha)})`;
                } else if (theme === 'premium-particles-stardust') {
                    ctx.fillStyle = accentColor;
                    ctx.globalAlpha = p.alpha;
                    p.y += p.vy;
                    if (p.y < -10) {
                        p.y = canvas.height + 10;
                        p.x = Math.random() * canvas.width;
                    }
                }

                ctx.fill();
                ctx.globalAlpha = 1;
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme, accentColor]);

    // If standard theme, return nothing (handled by global CSS)
    if (theme === 'dark' || theme === 'light') return null;

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
            {theme === 'premium-gradient-1' && (
                <div className="absolute inset-0 bg-[length:400%_400%] animate-[gradientBG_15s_ease_infinite]"
                    style={{ backgroundImage: 'linear-gradient(-45deg, #0f172a, #312e81, #581c87, #000000)' }} />
            )}

            {theme === 'premium-gradient-2' && (
                <div className="absolute inset-0 bg-[length:400%_400%] animate-[gradientBG_15s_ease_infinite]"
                    style={{ backgroundImage: 'linear-gradient(-45deg, #1a0000, #450a0a, #7f1d1d, #000000)' }} />
            )}

            {theme.includes('particle') && (
                <div className="absolute inset-0 bg-black">
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                </div>
            )}

            <style>
                {`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
            </style>
        </div>
    );
};
