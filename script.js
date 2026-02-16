(function() {
  'use strict';

  if (window.__appInitialized) return;
  window.__appInitialized = true;

  const state = {
    menuOpen: false,
    formSubmitting: false,
    scrollY: 0
  };

  const config = {
    headerSelector: '.l-header',
    navSelector: '.c-nav',
    toggleSelector: '.c-nav__toggle',
    navListSelector: '.navbar-nav',
    navLinkSelector: '.c-nav__link, .nav-link',
    formSelector: '.c-form',
    scrollOffset: 80
  };

  const debounce = (fn, delay) => {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  const initBurgerMenu = () => {
    const nav = qs(config.navSelector);
    const toggle = qs(config.toggleSelector);
    const navList = qs(config.navListSelector);

    if (!nav || !toggle || !navList) return;

    const closeMenu = () => {
      state.menuOpen = false;
      nav.classList.remove('is-open');
      navList.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('u-no-scroll');
    };

    const openMenu = () => {
      state.menuOpen = true;
      nav.classList.add('is-open');
      navList.classList.add('show');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('u-no-scroll');
    };

    const toggleMenu = () => {
      state.menuOpen ? closeMenu() : openMenu();
    };

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.menuOpen) closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (state.menuOpen && !nav.contains(e.target)) closeMenu();
    });

    qsa(config.navLinkSelector, navList).forEach(link => {
      link.addEventListener('click', () => {
        if (state.menuOpen) closeMenu();
      });
    });

    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth >= 1024 && state.menuOpen) closeMenu();
    }, 150));
  };

  const initSmoothScroll = () => {
    qsa('a[href*="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (!href || href === '#' || href === '#!') return;

        const hashIndex = href.indexOf('#');
        if (hashIndex === -1) return;

        const targetId = href.substring(hashIndex + 1);
        const target = document.getElementById(targetId);
        if (!target) return;

        e.preventDefault();

        const header = qs(config.headerSelector);
        const headerHeight = header ? header.offsetHeight : config.scrollOffset;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        if (window.history) {
          window.history.pushState(null, null, '#' + targetId);
        }
      });
    });
  };

  const initScrollSpy = () => {
    const sections = qsa('section[id]');
    if (!sections.length) return;

    const navLinks = qsa(config.navLinkSelector);
    if (!navLinks.length) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -80% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('#' + id)) {
              navLinks.forEach(l => {
                l.classList.remove('active');
                l.removeAttribute('aria-current');
              });
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
  };

  const initActiveMenu = () => {
    const currentPath = window.location.pathname;
    const isHomepage = currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/');

    qsa(config.navLinkSelector).forEach(link => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');

      const href = link.getAttribute('href');
      if (!href) return;

      const linkPath = href.split('#')[0];

      if (isHomepage && (linkPath === '/' || linkPath === '/index.html' || linkPath === '')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else if (!isHomepage && linkPath && currentPath.includes(linkPath) && linkPath !== '/') {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  };

  const initScrollHeader = () => {
    const header = qs(config.headerSelector);
    if (!header) return;

    const handleScroll = () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > 50) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      state.scrollY = currentScroll;
    };

    window.addEventListener('scroll', debounce(handleScroll, 100));
  };

  const initFormValidation = () => {
    const forms = qsa(config.formSelector);
    if (!forms.length) return;

    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+\d\s\-\(\)]{10,20}$/,
      name: /^[a-zA-ZÀ-ÿ\s\-']{2,50}$/
    };

    const showError = (input, message) => {
      const group = input.closest('.c-form__group') || input.parentElement;
      group.classList.add('has-error');
      
      let errorEl = group.querySelector('.c-form__error, .invalid-feedback');
      if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'c-form__error invalid-feedback';
        input.parentElement.appendChild(errorEl);
      }
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    };

    const clearError = (input) => {
      const group = input.closest('.c-form__group') || input.parentElement;
      group.classList.remove('has-error');
      const errorEl = group.querySelector('.c-form__error, .invalid-feedback');
      if (errorEl) errorEl.style.display = 'none';
    };

    const validateField = (input) => {
      clearError(input);
      const value = input.value.trim();
      const type = input.type;
      const name = input.name;
      const required = input.hasAttribute('required') || input.getAttribute('aria-required') === 'true';

      if (required && !value) {
        showError(input, 'Dit veld is verplicht');
        return false;
      }

      if (type === 'email' && value && !patterns.email.test(value)) {
        showError(input, 'Voer een geldig e-mailadres in');
        return false;
      }

      if (type === 'tel' && value && !patterns.phone.test(value)) {
        showError(input, 'Voer een geldig telefoonnummer in');
        return false;
      }

      if ((name === 'firstName' || name === 'lastName') && value && !patterns.name.test(value)) {
        showError(input, 'Voer een geldige naam in');
        return false;
      }

      if (input.tagName === 'TEXTAREA' && value && value.length < 10) {
        showError(input, 'Voer minimaal 10 tekens in');
        return false;
      }

      if (type === 'checkbox' && required && !input.checked) {
        showError(input, 'U moet akkoord gaan met de voorwaarden');
        return false;
      }

      return true;
    };

    forms.forEach(form => {
      const inputs = qsa('input, textarea, select', form);

      inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
          if (input.closest('.c-form__group')?.classList.contains('has-error')) {
            validateField(input);
          }
        });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (state.formSubmitting) return;

        let isValid = true;
        inputs.forEach(input => {
          if (!validateField(input)) isValid = false;
        });

        if (!isValid) {
          const firstError = form.querySelector('.has-error input, .has-error textarea, .has-error select');
          if (firstError) firstError.focus();
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';

        state.formSubmitting = true;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verzenden...';
          submitBtn.classList.add('is-loading');
        }

        setTimeout(() => {
          state.formSubmitting = false;

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.classList.remove('is-loading');
          }

          window.location.href = 'thank_you.html';
        }, 1500);
      });
    });
  };

  const initLazyImages = () => {
    qsa('img:not([loading])').forEach(img => {
      if (!img.classList.contains('c-logo__img') && !img.hasAttribute('data-critical')) {
        img.setAttribute('loading', 'lazy');
      }
    });
  };

  const init = () => {
    initBurgerMenu();
    initSmoothScroll();
    initScrollSpy();
    initActiveMenu();
    initScrollHeader();
    initFormValidation();
    initLazyImages();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
