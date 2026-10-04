# Performance

Review:
- startup path
- large question-bank loading
- list virtualization
- SQLite query indexes
- repeated derived calculations
- unnecessary rerenders
- image sizes
- theme switching
- long mock sessions
- background sync work

Do not load the entire question bank into JS memory when a query/repository can select what is needed.
