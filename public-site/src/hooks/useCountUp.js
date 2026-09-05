import { useEffect, useState, useRef } from 'react';

export function useCountUp(targetValue, duration = 2, delay = 0) {
  const [count, setCount] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: '-80px' }
    );

    observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  useEffect(() => {
    if (!isInView) return;

    const end = parseInt(String(targetValue).replace(/[^0-9]/g, ''), 10);
    if (isNaN(end)) {
      setCount(targetValue);
      return;
    }

    if (end === 0) {
      setCount(0);
      return;
    }

    const totalSteps = 60 * duration; // 60 FPS approx
    const increment = end / totalSteps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const nextVal = Math.min(Math.floor(increment * currentStep), end);
      setCount(nextVal);

      if (currentStep >= totalSteps) {
        setCount(end);
        clearInterval(timer);
      }
    }, (duration * 1000) / totalSteps);

    return () => clearInterval(timer);
  }, [targetValue, duration, delay, isInView]);

  return [ref, count];
}
