"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useAnimation, AnimatePresence, Variants } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
    Users,
    Map,
    Heart,
    ChevronRight,
    Download,
    Calendar,
    Compass,
    Lock,
    Smartphone,
    UserPlus,
    Sparkles,
    ArrowRight,
    Menu,
    X
} from 'lucide-react';

import styles from './page.module.css';

// --- Reusable Components ---

const FadeIn = ({ children, delay = 0, direction = 'up' }: { children: React.ReactNode; delay?: number; direction?: string }) => {
    const controls = useAnimation();
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

    useEffect(() => {
        if (inView) {
            controls.start('visible');
        }
    }, [controls, inView]);

    const variants: Variants = {
        hidden: {
            opacity: 0,
            y: direction === 'up' ? 30 : 0,
            x: direction === 'left' ? 30 : direction === 'right' ? -30 : 0,
            filter: 'blur(10px)'
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
            filter: 'blur(0px)',
            transition: { duration: 0.8, delay, ease: [0.21, 0.45, 0.32, 0.9] }
        }
    };

    return (
        <motion.div ref={ref} initial="hidden" animate={controls} variants={variants}>
            {children}
        </motion.div>
    );
};

const Button = ({ children, variant = 'primary', className = '', onClick }: { children: React.ReactNode; variant?: string; className?: string; onClick?: () => void }) => {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`${styles.btnBase} ${variant === 'primary' ? styles.btnPrimary : styles.btnSecondary} ${className}`}
            onClick={onClick}
        >
            {children}
        </motion.button>
    );
};

// --- Particles Component ---
const HeartParticles = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        const mouse = { x: -1000, y: -1000 };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };
        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            baseX: number;
            baseY: number;
            density: number;
            angle: number;
            spinSpeed: number;
            opacity: number;
            color: string;

            constructor(x: number, y: number, isFar: boolean = false) {
                this.x = x;
                this.y = y;
                this.baseX = x;
                this.baseY = y;
                this.size = Math.random() * 10 + 3;
                this.speedX = 0;
                this.speedY = 0;
                this.density = (Math.random() * 30) + 5;
                this.angle = Math.random() * 360;
                this.spinSpeed = (Math.random() - 0.5) * 5;
                this.opacity = (Math.random() * 0.5 + 0.3) * (isFar ? 0.4 : 1);

                const colors = [
                    '#FF4081', '#F50057', '#FF80AB', '#FF1744', '#F5004F',
                    '#FF5252', '#FF4081', '#EC407A', '#F06292', '#E91E63',
                    '#D81B60', '#C2185B', '#FF6E40', '#FF3D00', '#FF8A80'
                ];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            draw() {
                if (!ctx) return;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate((this.angle * Math.PI) / 180);

                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.opacity;

                const d = this.size;
                ctx.beginPath();
                ctx.moveTo(0, d / 4);
                ctx.quadraticCurveTo(0, 0, d / 4, 0);
                ctx.quadraticCurveTo(d / 2, 0, d / 2, d / 4);
                ctx.quadraticCurveTo(d / 2, 0, d * 3 / 4, 0);
                ctx.quadraticCurveTo(d, 0, d, d / 4);
                ctx.quadraticCurveTo(d, d / 2, d / 2, d * 3 / 4);
                ctx.quadraticCurveTo(0, d / 2, 0, d / 4);
                ctx.fill();
                ctx.restore();
            }

            update() {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const maxDistance = 200;
                const force = (maxDistance - distance) / maxDistance;
                const directionX = forceDirectionX * force * this.density;
                const directionY = forceDirectionY * force * this.density;

                if (distance < maxDistance) {
                    this.speedX -= directionX * 0.5;
                    this.speedY -= directionY * 0.5;
                } else {
                    if (this.x !== this.baseX) {
                        const dx = this.x - this.baseX;
                        this.speedX += dx / 80;
                    }
                    if (this.y !== this.baseY) {
                        const dy = this.y - this.baseY;
                        this.speedY += dy / 80;
                    }
                }

                this.speedX *= 0.85;
                this.speedY *= 0.85;

                this.x += this.speedX;
                this.y += this.speedY;
                this.angle += this.spinSpeed;
            }
        }

        const init = () => {
            particles = [];
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            for (let i = 0; i < 400; i++) {
                const ringIndex = Math.random();
                const radius = (ringIndex * ringIndex) * Math.min(canvas.width, canvas.height) * 0.8 + 50;
                const angle = Math.random() * Math.PI * 2;

                let x = centerX + Math.cos(angle) * radius;
                let y = centerY + Math.sin(angle) * radius;

                x += (Math.random() - 0.5) * 80;
                y += (Math.random() - 0.5) * 80;

                const isFar = radius > Math.min(canvas.width, canvas.height) * 0.5;

                particles.push(new Particle(x, y, isFar));
            }
        };

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].draw();
                particles[i].update();
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        const timeoutId = setTimeout(() => {
            init();
            animate();
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={styles.particlesCanvas}
        />
    );
};

// --- Main App Component ---

export default function App() {
    const router = useRouter();
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);

    useEffect(() => {
        // If already running as installed PWA, redirect to the app
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        if (isStandalone) {
            router.replace('/application');
            return;
        }

        type PwaWindow = Window & { __pwaInstallPrompt?: Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } };
        const w = window as PwaWindow;

        const applyPrompt = () => {
            if (w.__pwaInstallPrompt) {
                console.log('[PWA] beforeinstallprompt capturado ✅ - el botón de instalar está listo');
                setDeferredPrompt(w.__pwaInstallPrompt);
            }
        };

        // Check if already captured before React mounted, on next tick to avoid react-compiler warning
        const timerId = setTimeout(() => {
            if (w.__pwaInstallPrompt) {
                console.log('[PWA] beforeinstallprompt ya estaba capturado ✅');
            } else {
                console.log('[PWA] Esperando evento pwaInstallReady...');
            }
            applyPrompt();
        }, 0);

        window.addEventListener('pwaInstallReady', applyPrompt);
        return () => {
            clearTimeout(timerId);
            window.removeEventListener('pwaInstallReady', applyPrompt);
        };
    }, [router]);

    const handleInstall = async () => {
        if (!deferredPrompt) {
            console.warn('[PWA] El botón fue pulsado pero beforeinstallprompt aún no se ha disparado. Posibles causas: la app ya está instalada, el SW aún no está activo, o Chrome está esperando más engagement del usuario.');
            return;
        }
        console.log('[PWA] Lanzando diálogo de instalación...');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] El usuario eligió: ${outcome}`);
        if (outcome === 'accepted') setDeferredPrompt(null);
    };

    const steps = [
        {
            id: '01',
            title: 'Crea tu Chukipu',
            description: 'Ponle un nombre y elige el tono espacial.',
            icon: <Sparkles size={20} />,
            phoneContent: (
                <div className={styles.animateFadeIn + " " + styles.step1Content}>
                    {/* Top Header */}
                    <div className={styles.mockAltHeader}>
                        <div className={styles.mockAltLogo} />
                        <div className={styles.mockAltHeaderIcon} />
                    </div>


                    {/* Main Card */}
                    <div className={styles.mockAltMainCard}>
                        <div className={styles.mockAltCardImage} />
                        <div className={styles.mockAltCardContent}>
                            <div className={styles.mockAltCardCategory} />
                            <div className={styles.mockAltCardTitle} />
                            <div className={styles.mockAltCardLocation} />
                        </div>
                    </div>

                    {/* Bottom Nav Area */}
                    <div className={styles.mockAltBottomNav}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={i === 3 ? styles.mockAltNavIconCenter : styles.mockAltNavIcon} />
                        ))}
                    </div>
                </div>
            )
        },
        {
            id: '02',
            title: 'Invita a quien quieras',
            description: 'El acceso es privado y seguro.',
            icon: <UserPlus size={20} />,
            phoneContent: (
                <div className={styles.animateFadeIn + " " + styles.step2Content}>
                    {/* Top Header */}

                    {/* Main Content Area */}
                    <div className={styles.mockAltInviteArea}>
                        {/* Icon/Avatar Circle */}
                        <div className={styles.mockAltInviteIconWrap}>
                            <div className={styles.mockAltInviteIcon} />
                        </div>

                        {/* Text Lines */}
                        <div className={styles.mockAltInviteTitle} />

                        {/* Code Input Box */}
                        <div className={styles.mockAltInviteInputBox}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className={styles.mockAltInviteInputChar} />
                            ))}
                        </div>
                    </div>

                    {/* Bottom Button */}
                    <div className={styles.mockAltInviteButtonWrap}>
                        <div className={styles.mockAltInviteButton} />
                    </div>
                </div>
            )
        },
        {
            id: '03',
            title: 'Agreguen planes juntos',
            description: 'Sincronicen sus mentes.',
            icon: <Calendar size={20} />,
            phoneContent: (
                <div className={styles.animateFadeIn + " " + styles.step3Content}>
                    {/* Top Screen Area (Header + Title) */}
                    <div className={styles.mockAltChukipuTop}>
                        <div className={styles.mockAltHeaderCentered}>
                            <div className={styles.mockAltHeaderBackIcon} />
                            <div className={styles.mockAltHeaderMenuIcon} />
                        </div>
                        <div className={styles.mockAltChukipuTitleWrap}>
                            <div className={styles.mockAltChukipuTitle} />
                            <div className={styles.mockAltChukipuSubtitle} />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.mockAltActionBtns}>
                        <div className={styles.mockAltBtnPrimary}>+</div>
                        <div className={styles.mockAltBtnSecondary} />
                    </div>

                    {/* List Section */}
                    <div className={styles.mockAltListSection}>
                        <div className={styles.mockAltListHeader}>
                            <div className={styles.mockAltListDot} />
                            <div className={styles.mockAltListTitle} />
                            <div className={styles.mockAltListCount} />
                        </div>

                        <div className={styles.mockAltListItem}>
                            <div className={styles.mockAltListItemImg} />
                            <div className={styles.mockAltListItemText}>
                                <div className={styles.mockAltListItemTitle} />
                                <div className={styles.mockAltListItemSub} />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Nav Area */}
                    <div className={styles.mockAltBottomNav}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={i === 3 ? styles.mockAltNavIconCenter : styles.mockAltNavIcon} />
                        ))}
                    </div>
                </div>
            )
        }
    ];

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={styles.container}>

            {/* Navigation */}
            <nav className={`${styles.nav} ${isScrolled ? styles.navScrolled : styles.navNotScrolled}`}>
                <div className={styles.navContent}>
                    {/* Left: Logo */}
                    <div className={styles.navLogoContainer}>
                        <div className={styles.logo}>
                            <img
                                src="/logos/chukipu-logo-pink.png"
                                alt="Chukipu Logo"
                                className={styles.navLogoImg}
                            />
                        </div>
                    </div>

                    {/* Center: Desktop Links */}
                    <div className={styles.navLinksCenter}>
                        <div className={styles.navLinks}>
                            <a href="#about" className={styles.navLink}>
                                Qué es Chukipu
                                <span className={styles.navLinkUnderline}></span>
                            </a>
                            <a href="#how" className={styles.navLink}>
                                Cómo funciona
                                <span className={styles.navLinkUnderline}></span>
                            </a>
                            <a href="#features" className={styles.navLink}>
                                Contenido
                                <span className={styles.navLinkUnderline}></span>
                            </a>
                        </div>
                    </div>

                    {/* Right: CTA */}
                    <div className={styles.navRight}>
                        <Button className={styles.btnNav} onClick={handleInstall}>Obtener la app</Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={styles.heroSection}>
                <HeartParticles />
                <div className={styles.heroContent}>
                    <FadeIn>
                        <div className={styles.heroPreTitle}>
                            CHUKIPU<span className={styles.logoDot}>.</span>
                        </div>
                        <h1 className={styles.heroTitle}>
                            Los planes que soñais
                            <div className={styles.heroTitleBottom}>
                                juntos, <span className={styles.heroTitleHighlight}>viven aquí.</span>
                            </div>
                        </h1>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <p className={styles.heroDesc}>
                            Crea tu Chukipu. Guarda experiencias. <br className={styles.heroBr} />
                            Construye recuerdos antes de vivirlos.
                        </p>
                    </FadeIn>
                    <FadeIn delay={0.4}>
                        <div className={styles.heroButtons}>
                            <a href="#footer" className={styles.heroAnchor}>
                                <Button variant="secondary" className={styles.heroBtnSecondary}>Conócenos</Button>
                            </a>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className={styles.aboutSection}>
                <div className={styles.aboutContainer}>
                    <div className={styles.aboutGridWrapper}>
                        {/* Left: Mockup */}
                        <FadeIn delay={0.1} direction="right">
                            <div className={styles.mockupCardWrapperLarge}>
                                <div className={styles.mockupCardLarge}>
                                    <img
                                        src="/img/muckup1.png"
                                        alt="Chukipu App Mockup"
                                        className={styles.mockupImage}
                                    />
                                </div>
                            </div>
                        </FadeIn>

                        {/* Right: Content */}
                        <FadeIn delay={0.2} direction="left">
                            <div className={styles.aboutContent}>
                                <h2 className={styles.aboutTitle}>
                                    Diseñado para <br />
                                    compartir lo que importa.
                                </h2>
                                <p className={styles.aboutDesc}>
                                    Un espacio único, privado y visual donde todos esos planes, deseos e ideas toman forma antes de hacerse realidad.
                                    Alejado del ruido de las redes sociales, diseñado exclusivamente para ti y tus personas favoritas.
                                </p>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* Emotional Section */}
            <section className={styles.emotionSection}>
                <div className={styles.emotionContainer}>
                    <FadeIn>
                        <p className={styles.emotionText}>
                            “No es una lista. <br />
                            Es una <span className={styles.emotionSpan}>
                                historia
                                <motion.span
                                    initial={{ width: 0 }}
                                    whileInView={{ width: '100%' }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className={styles.emotionUnderline}
                                />
                            </span> que estáis escribiendo juntos.”
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className={styles.howSection}>
                <div className={styles.howContainer}>
                    <FadeIn delay={0.1} direction="right">
                        <div className={styles.howLeft}>
                            <div className={styles.howHeader}>
                                <p className={styles.howSubtitle}>Cómo funciona</p>
                                <h2 className={styles.howMainTitle}>
                                    Tu mundo compartido, <br />
                                    <span className={styles.howMainTitleLight}>siempre en sintonía.</span>
                                </h2>
                            </div>

                            <div className={styles.howStepsWrapper}>
                                {steps.map((step, index) => (
                                    <button
                                        key={step.id}
                                        onClick={() => setActiveStep(index)}
                                        className={`${styles.stepBtn} ${activeStep === index ? styles.stepBtnActive : styles.stepBtnInactive}`}
                                    >
                                        <div className={`${styles.stepIconWrap} ${activeStep === index ? styles.stepIconWrapActive : styles.stepIconWrapInactive}`}>
                                            {step.icon}
                                        </div>
                                        <div className={styles.stepTextWrap}>
                                            <h3 className={activeStep === index ? styles.stepTitleActive : styles.stepTitleInactive}>
                                                {step.title}
                                            </h3>
                                            <p className={styles.stepDesc}>{step.description}</p>
                                        </div>
                                        {activeStep === index && <ArrowRight size={16} className={styles.stepArrow} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </FadeIn>

                    <FadeIn delay={0.2} direction="left">
                        <div className={styles.howRight}>
                            <div className={styles.mockupContainer}>
                                <div className={styles.mockupBlur} />

                                <div className={styles.phoneFrame}>
                                    <div className={styles.phoneNotch} />

                                    <div className={styles.phoneScreen}>
                                        <div className={styles.phoneStatusBar}>
                                            <div className={styles.phoneStatusLeft} />
                                            <div className={styles.phoneStatusRight}>
                                                <div className={styles.phoneStatusDotEmpty} />
                                                <div className={styles.phoneStatusDotFull} />
                                            </div>
                                        </div>

                                        <div className={styles.phoneContentWrapper}>
                                            <div className={styles.phoneProfileBar}>
                                                <div className={styles.phoneAvatar} />
                                                <div className={styles.phoneNameLine} />
                                            </div>
                                            {steps[activeStep].phoneContent}
                                        </div>

                                        <div className={styles.phoneBottomBar}>
                                            <div className={styles.phoneHomeIndicator} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Features Carousel */}
            <section id="features" className={styles.featuresSection}>
                <div className={styles.featuresTicker}>
                    <div className={styles.featuresTrack}>
                        {/* We use three identical sets to create a seamless infinite loop that covers ultra-wide screens */}
                        {[1, 2, 3].map((setIndex) => (
                            <div key={setIndex} className={styles.featuresSet}>
                                {[
                                    { icon: <Calendar />, title: "Organización", desc: "Líneas de tiempo claras." },
                                    { icon: <Compass />, title: "Categorías", desc: "Aventuras de todo tipo." },
                                    { icon: <Download />, title: "Guardado rápido", desc: "Importa de redes al instante." },
                                    { icon: <Lock />, title: "Espacios privados", desc: "Completamente seguro." },
                                    { icon: <Map />, title: "Rutas", desc: "Mapas interactivos en vivo." },
                                    { icon: <Users />, title: "Compartir", desc: "Planes de forma colaborativa." }
                                ].map((feature, idx) => (
                                    <div key={`${setIndex}-${idx}`} className={styles.heartItem}>
                                        <div className={styles.heartWrapper}>
                                            <Heart className={styles.heartBg} fill="#CE8D8B" stroke="#CE8D8B" />
                                            <div className={styles.heartCategoryIcon}>
                                                {React.cloneElement(feature.icon as React.ReactElement<{ size?: number; strokeWidth?: number; color?: string }>, { size: 40, strokeWidth: 1.5, color: '#ffffff' })}
                                            </div>
                                            <div className={styles.heartContent}>
                                                <h4 className={styles.heartContentTitle}>{feature.title}</h4>
                                                <p className={styles.heartContentDesc}>{feature.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className={styles.ctaSection}>
                <div className={styles.ctaContainer}>
                    <FadeIn>
                        <h2 className={styles.ctaTitle}>
                            Empieza tu próximo recuerdo hoy.<br />
                            Descargar Chukipu.
                        </h2>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <div className={styles.logoCta}>
                            CHUKIPU<span className={styles.logoDot}>.</span>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Footer */}
            <footer id="footer" className={styles.footer}>
                <div className={styles.footerContainer}>
                    <div className={styles.logo}>
                        <img
                            src="/logos/chukipu-logo-pink.png"
                            alt="Chukipu Logo"
                            className={styles.navLogoImg}
                        />
                    </div>
                    <div className={styles.footerLinks}>
                        <a href="#" className={styles.footerLink}>Instagram</a>
                        <a href="#" className={styles.footerLink}>Twitter</a>
                        <a href="#" className={styles.footerLink}>Términos</a>
                        <a href="#" className={styles.footerLink}>Privacidad</a>
                    </div>
                    <div className={styles.footerCopyright}>
                        © 2024 Chukipu App Inc.
                    </div>
                </div>
            </footer>
        </div>
    );
}