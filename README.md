# Saleor App Offers POC

> [!NOTE]
> "An offer" is a pattern that can be used to create a special price for a product. It is a page with a reference to a product variant and a special price.

> [!TIP]
> By running [saleor/configurator](https://github.com/saleor/configurator)'s `bootstrap` command with the `config.yml` file, you can create the data types needed for this app.

A Saleor app that enables special offer prices for products in your store. It allows you to:

1. Display store pages with special offers
2. Display products with both their base price and special offer price
3. Enable direct purchase of products at the offer price
4. Track offers through order metadata

## Features

- **Store Pages**: Display store pages with special offers
- **Offer Management**: Each offer can reference a product variant and set a special price
- **Price Override**: Automatically applies the offer price during checkout
- **Checkout**: One-click purchase that creates and completes the checkout
- **Order Tracking**: Stores offer information in order metadata for reference

## Development

1. Install dependencies

```bash
pnpm install
```

2. Configure environment variables

```bash
cp .env.example .env.local
```

3. Start the development server

```bash
pnpm dev
```

## Assumptions

The app requires the following configuration in Saleor:

### Page Types

1. A page type with slug `store` - used for store pages
2. A page type with slug `offer` - used for offer pages

### Attributes

1. Store page attributes:
   - `store-offers` (reference attribute) - references offer pages
2. Offer page attributes:
   - `offer-variant` (reference attribute) - references a product variant
   - `offer-price` (text attribute) - contains price in JSON format: `{"amount": 14.99, "currency": "USD"}`

### Pages

1. Create store pages using the `store` page type
2. Create offer pages using the `offer` page type
3. Configure offer pages with:
   - Link to a product variant using `offer-variant`
   - Set special price using `offer-price`
4. Add offer pages to a store using `store-offers` attribute

The app will then:

- Display store pages with their associated offers
- Show both base and offer prices for each product
- Enable direct purchase at the offer price

## Note

- This repo is a fork of [Saleor App Checkout Prices](https://github.com/saleor/saleor-app-checkout-prices).
