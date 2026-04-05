import React, { useEffect, useRef } from 'react';
import { useUI } from '../contexts/UIContext';

export const PremiumBackground: React.FC = () => {
    const { theme, accentColor } = useUI();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!theme.includes('particle')) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false }); // Performance boost: opaque canvas
        if (!ctx) return;

        let particles: any[] = [];
        let animationFrameId: number;
        let nebulaGradient: CanvasGradient;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        const init = () => {
            particles = [];
            const count = theme === 'premium-particles-galaxy' ? 350 : 200;
            
            for (let i = 0; i < count; i++) {
                if (theme === 'premium-particles-galaxy') {
                    particles.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        z: Math.random() * canvas.width, // Star depth
                        size: 0.1 + Math.random() * 1.5,
                        opacity: 0.1 + Math.random() * 0.8,
                        twinkle: Math.random() * Math.PI,
                        speed: 0.2 + Math.random() * 0.5,
                        color: Math.random() > 0.8 ? '#a5f3fc' : Math.random() > 0.9 ? '#fecaca' : '#ffffff'
                    });
                } else if (theme === 'premium-particles-moon') {
                    particles.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        radius: Math.random() * 1.2,
                        alpha: Math.random(),
                        twinkleSpeed: 0.01 + Math.random() * 0.03,
                        vx: (Math.random() - 0.5) * 0.05,
                        vy: (Math.random() - 0.5) * 0.05,
                    });
                } else if (theme === 'premium-particles-stardust') {
                    particles.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        size: 1 + Math.random() * 3,
                        vx: (Math.random() - 0.5) * 0.3,
                        vy: -0.2 - Math.random() * 0.8,
                        alpha: 0.2 + Math.random() * 0.8,
                        oscillation: Math.random() * Math.PI,
                        oscillationSpeed: 0.02 + Math.random() * 0.03
                    });
                }
            }

            if (theme === 'premium-particles-moon') {
                particles.push({ isShootingStar: true, active: false, x: 0, y: 0, length: 0, vx: 0, vy: 0, life: 0, maxLife: 0 });
            }
        };

        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            // Draw Background Base
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (theme === 'premium-particles-galaxy') {
                // Nebula Layers
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                
                const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width);
                grad.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
                grad.addColorStop(0.5, 'rgba(8, 7, 24, 0.2)');
                grad.addColorStop(1, '#000000');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                particles.forEach(p => {
                    p.z -= p.speed;
                    if (p.z <= 0) p.z = canvas.width;

                    const sx = (p.x - centerX) * (canvas.width / p.z) + centerX;
                    const sy = (p.y - centerY) * (canvas.width / p.z) + centerY;
                    const size = p.size * (canvas.width / p.z);

                    if (sx < 0 || sx > canvas.width || sy < 0 || sy > canvas.height) return;

                    p.twinkle += 0.05;
                    const opacity = p.opacity * (0.5 + Math.sin(p.twinkle) * 0.5);

                    ctx.beginPath();
                    ctx.arc(sx, sy, size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = opacity;
                    ctx.fill();
                });
                ctx.globalAlpha = 1;

            } else if (theme === 'premium-particles-moon') {
                 // Responsive Moon
                 const moonX = canvas.width * (canvas.width < 768 ? 0.5 : 0.85);
                 const moonY = canvas.height * (canvas.width < 768 ? 0.15 : 0.2);
                 const moonRadius = canvas.width < 768 ? 50 : 70;

                 // Atmospheric Glow
                 const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius, moonX, moonY, moonRadius * 4);
                 moonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
                 moonGlow.addColorStop(1, 'transparent');
                 ctx.fillStyle = moonGlow;
                 ctx.fillRect(0, 0, canvas.width, canvas.height);

                 // Moon Rendering
                 ctx.save();
                 const moonGrad = ctx.createRadialGradient(moonX - 20, moonY - 20, 10, moonX, moonY, moonRadius);
                 moonGrad.addColorStop(0, '#f8fafc');
                 moonGrad.addColorStop(0.5, '#e2e8f0');
                 moonGrad.addColorStop(1, '#94a3b8');
                 
                 ctx.beginPath();
                 ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
                 ctx.fillStyle = moonGrad;
                 ctx.shadowBlur = 40;
                 ctx.shadowColor = 'rgba(255,255,255,0.2)';
                 ctx.fill();
                 
                 // Crater Details
                 ctx.fillStyle = 'rgba(0,0,0,0.05)';
                 ctx.beginPath(); ctx.arc(moonX - 20, moonY + 10, 15, 0, Math.PI * 2); ctx.fill();
                 ctx.beginPath(); ctx.arc(moonX + 25, moonY - 15, 12, 0, Math.PI * 2); ctx.fill();
                 ctx.beginPath(); ctx.arc(moonX + 10, moonY + 30, 8, 0, Math.PI * 2); ctx.fill();
                 ctx.restore();

                 particles.forEach(p => {
                    if (p.isShootingStar) {
                        if (!p.active && Math.random() < 0.005) {
                            p.active = true;
                            p.x = Math.random() * canvas.width;
                            p.y = Math.random() * canvas.height * 0.5;
                            p.vx = 10 + Math.random() * 10;
                            p.vy = 5 + Math.random() * 5;
                            p.maxLife = 40 + Math.random() * 40;
                            p.life = 0;
                        } else if (p.active) {
                            p.x += p.vx; p.y += p.vy; p.life++;
                            const alpha = 1 - (p.life / p.maxLife);
                            const grad = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 10, p.y - p.vy * 10);
                            grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
                            grad.addColorStop(1, 'transparent');
                            ctx.strokeStyle = grad;
                            ctx.lineWidth = 2;
                            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 10, p.y - p.vy * 10); ctx.stroke();
                            if (p.life >= p.maxLife) p.active = false;
                        }
                        return;
                    }
                    
                    p.alpha += p.twinkleSpeed;
                    if (p.alpha > 1 || p.alpha < 0.2) p.twinkleSpeed *= -1;
                    p.x += p.vx; p.y += p.vy;
                    if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
                    if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
                    
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
                 });

            } else if (theme === 'premium-particles-stardust') {
                particles.forEach(p => {
                    p.oscillation += p.oscillationSpeed;
                    p.x += p.vx + Math.sin(p.oscillation) * 0.5;
                    p.y += p.vy;

                    if (p.y < -20) {
                        p.y = canvas.height + 20;
                        p.x = Math.random() * canvas.width;
                    }

                    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    gradient.addColorStop(0, accentColor);
                    gradient.addColorStop(1, 'transparent');

                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.globalAlpha = 1;
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme, accentColor]);

    if (theme === 'dark' || theme === 'light') return null;

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-black">
            {theme === 'premium-gradient-1' && (
                <div className="absolute inset-0 transition-opacity duration-1000">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,#312e81_0%,transparent_50%),radial-gradient(circle_at_80%_80%,#581c87_0%,transparent_50%),radial-gradient(circle_at_50%_50%,#0f172a_0%,transparent_100%)] animate-[mesh_20s_ease-in-out_infinite]" />
                    <div className="absolute inset-0 bg-black/40" />
                </div>
            )}

            {theme === 'premium-gradient-2' && (
                <div className="absolute inset-0 transition-opacity duration-1000">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_10%_90%,#7f1d1d_0%,transparent_50%),radial-gradient(circle_at_90%_10%,#450a0a_0%,transparent_50%),radial-gradient(circle_at_50%_50%,#1a0505_0%,transparent_100%)] animate-[mesh_20s_ease-in-out_infinite]" />
                    <div className="absolute inset-0 bg-black/40" />
                </div>
            )}

            {theme.includes('particle') && (
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            )}

            <style>
                {`
                @keyframes mesh {
                    0%, 100% { transform: scale(1) translate(0, 0); }
                    33% { transform: scale(1.1) translate(2%, 2%); }
                    66% { transform: scale(1.05) translate(-1%, 3%); }
                }
                `}
            </style>
        </div>
    );
};
