#!/usr/bin/env python3
"""Create the Stripe side of the shop from products.json, then write the payment links back into it.

For every product and every size it makes one Stripe product named "<name> (Size M)", one price,
and one payment link, so the size shows on Stripe's checkout page, the receipt and the dashboard.
Run it again after adding products: sizes that already have a link are skipped.

  STRIPE_SECRET_KEY=sk_test_... python3 create_stripe_links.py --dry-run   (prints, creates nothing)
  STRIPE_SECRET_KEY=sk_test_... python3 create_stripe_links.py             (test mode)
  STRIPE_SECRET_KEY=sk_live_... python3 create_stripe_links.py --live      (real)

Use a restricted key with Write on Products, Prices and Payment Links (Stripe Dashboard > Developers
> API keys > Create restricted key). Nothing is created without a key. Never paste the key anywhere.
Photos must already be live on the site (push shop/images first), because Stripe fetches them by URL.
"""
import base64, json, os, sys, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(HERE, "products.json")
SITE = "https://agentcasper.work"
dry, live = "--dry-run" in sys.argv, "--live" in sys.argv
key = os.environ.get("STRIPE_SECRET_KEY", "")
if not dry:
    if not key:
        sys.exit("Set STRIPE_SECRET_KEY (a test key first).")
    if key.startswith("sk_live_") != live and key.startswith("rk_live_") != live and not key.startswith(("sk_test_", "rk_test_")):
        sys.exit("Unrecognised key.")
    if key.startswith(("sk_live_", "rk_live_")) != live:
        sys.exit("Key and mode do not match: test key without --live, live key with --live.")

cat = json.load(open(FILE))
cur = (cat.get("currency") or "USD").lower()
sizes_default = cat.get("sizes") or ["S", "M", "L", "XL", "XXL"]
ship = cat.get("shipping") or {}          # {"countries": ["SG","US"], "phone": true}
delivery = cat.get("delivery") or []      # ["Self collection (Singapore)"]: a "Delivery" dropdown on checkout

def post(path, data):
    if dry:
        print("  POST", path, json.dumps(data)[:200]); return {"id": "dry_" + path.replace("/", "_"), "url": "https://buy.stripe.com/dry-run"}
    req = urllib.request.Request("https://api.stripe.com/v1/" + path, data=urllib.parse.urlencode(data).encode(),
        headers={"Authorization": "Basic " + base64.b64encode((key + ":").encode()).decode()})
    try:
        with urllib.request.urlopen(req) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("Stripe said no: " + e.read().decode()[:400])

def make(p, label, vid, images, desc, buy, sizes):
    """One Stripe product + price + payment link per size that has no link yet. Returns how many were made."""
    n = 0
    for s in sizes:
        if buy.get(s):
            continue
        print("create", p["id"], vid or "", s)
        d = {"name": "%s%s (Size %s)" % (p["name"], " - " + label if label else "", s), "metadata[shop_id]": p["id"], "metadata[size]": s}
        if vid: d["metadata[variant]"] = vid
        if desc: d["description"] = desc[:500]
        img = (images or [None])[0]
        if img: d["images[0]"] = img if img.startswith("http") else SITE + img
        prod = post("products", d)
        price = post("prices", {"product": prod["id"], "currency": cur, "unit_amount": int(round(float(p["price"]) * 100))})
        l = {"line_items[0][price]": price["id"], "line_items[0][quantity]": "1",
             "line_items[0][adjustable_quantity][enabled]": "true", "line_items[0][adjustable_quantity][minimum]": "1", "line_items[0][adjustable_quantity][maximum]": "10",
             "allow_promotion_codes": "true", "metadata[shop_id]": p["id"], "metadata[size]": s}
        if vid: l["metadata[variant]"] = vid
        for i, c in enumerate(ship.get("countries") or []): l["shipping_address_collection[allowed_countries][%d]" % i] = c
        if ship.get("phone"): l["phone_number_collection[enabled]"] = "true"
        if delivery:
            l.update({"custom_fields[0][key]": "delivery", "custom_fields[0][label][type]": "custom", "custom_fields[0][label][custom]": "Delivery", "custom_fields[0][type]": "dropdown"})
            for i, o in enumerate(delivery):
                l["custom_fields[0][dropdown][options][%d][label]" % i] = o; l["custom_fields[0][dropdown][options][%d][value]" % i] = "".join(ch for ch in o.lower() if ch.isalnum())
            l["phone_number_collection[enabled]"] = "true"
        link = post("payment_links", l)
        buy[s] = link["url"]; n += 1
    return n


made = 0
for p in cat.get("products", []):
    sizes = p.get("sizes") or sizes_default
    # variants (colours on the same page): one set of links per variant, named "<name> - <label> (Size M)"
    for v in p.get("variants") or []:
        if isinstance(v.get("buy"), str):
            print("skip", p["id"], v["id"], "(already has one link)"); continue
        v["buy"] = v.get("buy") or {}
        made += make(p, v.get("label") or v["id"], v["id"], v.get("images") or p.get("images"), v.get("description") or p.get("description"), v["buy"], v.get("sizes") or sizes)
    if p.get("variants"):
        continue
    buy = p.get("buy")
    if isinstance(buy, str):                      # a single hand-made link: leave it alone
        print("skip", p["id"], "(already has one link)"); continue
    buy = buy or {}
    made += make(p, None, None, p.get("images"), p.get("description"), buy, sizes)
    p["buy"] = buy

if dry:
    print("Dry run: nothing created, products.json untouched."); sys.exit(0)
json.dump(cat, open(FILE, "w"), indent=2); open(FILE, "a").write("\n")
print("Done. %d payment links created and saved in products.json." % made)
