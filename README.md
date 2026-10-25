# Animesh Kherwar's Lab

Experiments of questionable usefulness. Static site — HTML, CSS and vanilla JavaScript — hosted on GitHub Pages at animeshkherwar.com.np.

## Structure
- `index.html` — home page (cards are generated from the registry)
- `assets/css/lab.css` — design system
- `assets/js/registry.js` — list of experiments and achievements
- `assets/js/lab.js` — shared engine: header, passport, achievements, toasts, sound, storage
- `experiments/<slug>/` — one folder per experiment (`index.html` + `app.js`)
- `404.html` — custom not-found page
All progress (achievements, scores, button presses, notes) is stored in the visitor's browser via localStorage.
