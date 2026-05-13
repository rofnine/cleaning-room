document.addEventListener('DOMContentLoaded', () => {
    // 1. Header Scroll Effect
    const header = document.getElementById('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. Smooth Scrolling for Navigation Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Adjust scroll position for fixed header
                const headerHeight = header.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 3. Intersection Observer for Scroll Animations
    // Dynamically add animation classes to elements
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

    // Flatten array and add base animation class
    const animatedElements = [];
    elementsToAnimate.forEach(nodeList => {
        nodeList.forEach((el, index) => {
            el.classList.add('animate-on-scroll');
            // Add slight transition delay based on index for staggered effect
            if(el.classList.contains('about-card') || el.classList.contains('service-card') || el.classList.contains('gallery-item') || el.classList.contains('advantage-item') || el.classList.contains('review-card') || el.classList.contains('step')) {
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

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
});
