document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');
    const nav = document.querySelector('.nav');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');

    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('active');
            mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.className = isOpen ? 'ph ph-x' : 'ph ph-list';
            }
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerHeight = header.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                if (nav && mobileMenuBtn && nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                    const icon = mobileMenuBtn.querySelector('i');
                    if (icon) icon.className = 'ph ph-list';
                }
            }
        });
    });

    const elementsToAnimate = [
        document.querySelectorAll('.section-title'),
        document.querySelectorAll('.section-desc'),
        document.querySelectorAll('.about-card'),
        document.querySelectorAll('.service-card'),
        document.querySelectorAll('.gallery-item'),
        document.querySelectorAll('.advantage-item'),
        document.querySelectorAll('.review-card'),
        document.querySelectorAll('.step')
    ];

    const animatedElements = [];
    elementsToAnimate.forEach(nodeList => {
        nodeList.forEach((el, index) => {
            el.classList.add('animate-on-scroll');
            if (el.classList.contains('about-card') || el.classList.contains('service-card') || el.classList.contains('gallery-item') || el.classList.contains('advantage-item') || el.classList.contains('review-card') || el.classList.contains('step')) {
                el.style.transitionDelay = `${index * 0.1}s`;
            }
            animatedElements.push(el);
        });
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const markAnimationComplete = (el) => {
        el.classList.add('visible');
        el.classList.add('animation-complete');
    };

    const revealPassedElements = () => {
        const revealLine = window.scrollY + window.innerHeight * 0.92;
        animatedElements.forEach(el => {
            if (el.classList.contains('animation-complete')) return;
            const elementTop = el.getBoundingClientRect().top + window.scrollY;
            if (elementTop <= revealLine) {
                markAnimationComplete(el);
                observer.unobserve(el);
            }
        });
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                markAnimationComplete(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
    window.addEventListener('scroll', revealPassedElements, { passive: true });
    window.addEventListener('pageshow', () => {
        animatedElements.forEach(el => {
            if (el.classList.contains('visible')) {
                el.classList.add('animation-complete');
            }
        });
        revealPassedElements();
    });
    revealPassedElements();
});
