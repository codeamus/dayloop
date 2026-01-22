# Gestión de Fechas en Dayloop

**Problema:** Los objetos `Date` de JS y `toISOString()` convierten a UTC, causando que un hábito marcado a las 11 PM se guarde como el día siguiente.

**Solución Dayloop:**
1. **Persistencia:** Siempre guardar fechas de cumplimiento como strings `YYYY-MM-DD`.
2. **Cálculos:** Usar helpers para obtener "Hoy" en formato local antes de consultar la DB.
3. **Comparaciones:** Las rachas (streaks) se calculan comparando la diferencia de días enteros entre fechas locales, no timestamps de milisegundos.