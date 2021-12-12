/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from "react";

export default function useUpdateEffect(effect: React.EffectCallback, deps?: React.DependencyList) {
    const isInitialMount = useRef(true);
  
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            return effect();
        }
    }, [effect, ...(deps || [])]);
}
