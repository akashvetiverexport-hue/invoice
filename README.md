# Akash Vettiver Invoice Studio

A lightweight, responsive invoice generator that runs in any modern browser. No build step or package installation is required.

## Use it

1. Open `index.html` in a browser, or publish this folder to a static web host such as GitHub Pages, Netlify, or Vercel.
2. Enter the invoice date and customer details.
3. Add product names, unit prices, and quantities. The invoice calculates each line as **unit price × quantity**, then adds the lines to the total due.
4. Add any delivery or freight amount in **Shipping charges**. It is added to the invoice total.
5. If the customer has paid an advance, enter it in **Advance payment**. The invoice shows the amount received and updates the remaining balance due.
6. Select **Print / PDF** and choose **Save as PDF** in the print dialog, or print the A4 invoice directly. The print layout is set to A4 portrait; if your phone’s print dialog offers paper size, leave it on A4.

Three product rows are provided to start. Use **Add another product** for more rows. Currency can be changed from INR to USD, EUR, GBP, or AED.

## Saving and cloud hosting

The current invoice draft and invoice-number sequence are stored in the browser's local storage. Hosting the app makes it available online, but drafts are not synced to a shared cloud database and remain specific to that browser/device. Shared multi-device storage or team access would require connecting a backend service and configuring its credentials.

## Files

- `index.html` — invoice editor and live preview
- `styles.css` — responsive screen layout and print-to-A4 styling
- `app.js` — invoice calculations, numbering, draft autosave, and PDF/print action
