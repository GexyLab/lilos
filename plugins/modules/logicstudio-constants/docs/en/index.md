# Constants

`logicstudio-constants` · requires the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks of the **fundamental constants**: mathematical constants (π, e, the golden ratio, the roots and logarithms of `Math`, Euler–Mascheroni, Feigenbaum…), physical constants with the **CODATA 2022** values (speed of light, Planck, Boltzmann, Avogadro, gravitation, particle masses, electromagnetic and physico-chemical constants…) and astronomical and Earth constants (astronomical unit, light-year, parsec, Sun, Earth, standard gravity).

## How to install it

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-constants` («Logic Studio: i blocchi delle costanti fondamentali…», "Logic Studio: the blocks of the fundamental constants…"). If the engine is missing, the AppStore installs it together. After the installation the blocks appear in the **Blocks** tab of the IDE, in the **Values** category.

A project that uses these blocks on a lilOS where the package is not installed shows the blocks with **The package is missing**, and an active program stays waiting until the package is back.

## The blocks

| Block | What it does |
|---|---|
| [Math constants (Math.PI, Math.E…)](const.math) | 25 mathematical constants and the limits of JavaScript numbers. |
| [Physical constants (CODATA)](const.physics) | 45 physical constants, with symbol, SI unit and uncertainty. |
| [Astronomical and Earth constants](const.astro) | 17 constants of distances, times, Sun and Earth, with symbol, SI unit and uncertainty. |

## How to use them

Each block has a **Constant** menu in **Properties**, where you choose which constant to send: each item shows the symbol and the name (for example «c · Speed of light in vacuum»). As for [Constant · Variable](core.value), the value goes out **once at the start** of the schema; if you link the hidden input **send**, it goes out instead at each pulse that arrives there.

The **value** output is always visible. The others (**symbol**, and for physical and astronomical constants **unit** and **uncertainty**) are hidden by default: show them with the **eye** in Properties when you need them.

All the values are in **SI units** (metres, kilograms, seconds, joules…). The **uncertainty** is the standard uncertainty in the same unit, `0` for constants that are exact by definition.

## Where the values come from

- **Mathematical**: the `Math` and `Number` constants of JavaScript, the others with all the digits a double-precision number can hold.
- **Physical**: the CODATA 2022 recommended values (NIST, 2024). The 7 constants that have defined the SI since 2019 are exact.
- **Astronomical and Earth**: the IAU definitions and nominal values (2012 and 2015), the WGS 84 and GRS 80 models for the Earth, and the CGPM standard gravity (1901).

When the recommended values change (CODATA updates them every 4 years), a new version of the package updates them: programs will use the new values from their next start.
