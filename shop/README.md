# Shop catalog

Everything the shop shows lives in two files. No code changes needed.

## products.json
```json
{
  "currency": "USD",
  "sizes": ["S", "M", "L", "XL", "XXL"],
  "products": [
    {
      "id": "casper-tee",
      "name": "Casper Tee",
      "price": 35,
      "description": "Short text. A blank line makes a new paragraph.",
      "images": ["/shop/images/casper-tee-1.jpg", "/shop/images/casper-tee-2.jpg"],
      "soldOut": ["XXL"]
    }
  ]
}
```
- `id`: letters, numbers and dashes only. It becomes the address: /shop/product/?p=casper-tee
- `sizes` at the top is the default for every product. Give one product its own `"sizes": ["M","L"]` to override.
- `short`: the name on the shirt picker (falls back to `name`). The shop is one page: pick the shirt, then the size. Old /shop/product/?p= links forward to /shop/?p=.
- `variants`: colours of one product on the same page, `[{"id": "black", "label": "Black", "images": [...], "buy": {...}, "description": "..."}]`. The page shows a Colour picker above Size; each colour has its own photos, links and description (falls back to the product's). The first is the default, `/shop/?p=<id>&v=<variant id>` opens another. Stripe reference becomes `<id>_<variant>_<size>`, and `create_stripe_links.py` names them "<name> - <label> (Size M)". Used by the Formerly Casper Jersey (black, pink).
- `soldOut`: sizes to grey out. `chart` (same shape as size-chart.json) gives one product its own size chart; `noChart: true` hides it. `hidden: true` removes a product from the shop without deleting it.
- `buy`: filled in for you by `create_stripe_links.py` (below). Without it the Buy button says "Not available yet". You can also paste one Stripe link as text to use the same link for every size.
- The size also goes to Stripe as the payment's reference, `<id>_<size>` (for example `casper-tee_M`).
- Put photos in `shop/images/`. Square photos look best.

## Stripe: one command does it
Add `"shipping": {"countries": ["SG", "US"], "phone": true}` next to `currency` if you ship (leave it out if not). Then:
```
cd shop
STRIPE_SECRET_KEY=sk_test_... python3 create_stripe_links.py --dry-run   # shows what it would create
STRIPE_SECRET_KEY=sk_test_... python3 create_stripe_links.py             # test mode
STRIPE_SECRET_KEY=sk_live_... python3 create_stripe_links.py --live      # real
```
For each product and size it creates a Stripe product named "Casper Tee (Size M)", a price, and a payment link, then saves the links into `products.json`. The size shows on Stripe's checkout and the receipt. Run it again after adding products: sizes that already have a link are skipped. Push `shop/images` to the site first, because Stripe fetches the photos by URL. Use a restricted key (Write on Products, Prices, Payment Links) and never paste it in a chat.

## size-chart.json
Fill in `columns` and `rows` and a "Size chart" link appears on every product. Empty rows = no link.
```json
{ "title": "Size chart", "note": "Measurements in cm", "columns": ["Size","Chest","Length"], "rows": [["S","92","68"],["M","98","70"]] }
```

## Before launch
- Delete the `noindex` line in `index.html` and `product/index.html`.
- Add a Shop link to the menus when you want it public.
