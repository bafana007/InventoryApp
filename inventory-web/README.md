# Inventory System — HTML / CSS / JS

The same inventory system rebuilt with no backend: plain HTML, CSS and vanilla JavaScript.
All data lives in `localStorage`, so the app runs by opening a file in a browser.

## Run

Double-click `index.html`, or serve the folder:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

Demo logins: `admin/admin123`, `employee/employee123`, `user/user123`.
"Reset demo data" in the top bar restores the seed data.

## Portals

| Portal | Route | Capabilities |
| --- | --- | --- |
| Admin | `#/admin` | Metrics, product CRUD, categories, user management (create, role change, activate/deactivate), all requests, valuation and movement reports |
| Employee | `#/employee` | Stock desk (in / out / count), reorder list, approve, reject or fulfil requests |
| User | `#/portal` | Catalog, raise and cancel requests, track status, edit profile and password |

## Structure

```
index.html          app shell (top bar + view container)
css/style.css       black-and-white theme
js/store.js         localStorage data layer, seed data, all business rules
js/ui.js            escaping and HTML building helpers
js/app.js           hash router, navigation, form action dispatch
js/views/           auth, admin, employee and user portal screens
```

Stock is never edited directly: every change appends a movement record, so the ledger in Reports
reconciles with on-hand quantities. Fulfilling a request issues stock out and fails if there is not
enough on hand.

## Note on passwords

There is no server, so passwords are only digested client-side for the demo — treat this build as a
prototype and do not reuse real credentials.
