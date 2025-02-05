import type { NextApiRequest, NextApiResponse } from "next";
import {
  CompleteCheckoutDocument,
  CountryCode,
  CreateExampleCheckoutDocument,
  GetStoreOfferDocument,
  UpdateCheckoutMetadataDocument,
  UpdateDeliveryDocument,
} from "../../../generated/graphql";
import { DEFAULT_CHANNEL, SALEOR_API_URL } from "../../const";
import { createClient } from "../../lib/create-graphql-client";
import { apl } from "../../saleor-app";

type SuccessfulResponse = {
  orderId: string;
};

type ErrorResponse = {
  errorMessage: string;
};

type ParsedOfferPrice = {
  amount: number;
  currency: string;
};

export type AddToCartResponseData = SuccessfulResponse | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddToCartResponseData>
) {
  console.info("Add to cart has been called");

  const offerId = req.body.offerId as string;

  if (!offerId) {
    console.error("Offer Id has not been specified");
    return res.status(400).json({ errorMessage: "offerId has not been provided" });
  }

  const client = createClient(SALEOR_API_URL, async () => {
    const authData = await apl.get(SALEOR_API_URL);
    if (!authData) {
      throw new Error("No auth data found. Is the app installed?");
    }
    return Promise.resolve({ token: authData.token });
  });

  // Get the offer page to find the variant ID and price
  const offerQuery = await client.query(GetStoreOfferDocument, { id: offerId }).toPromise();

  if (offerQuery.error) {
    console.error("Error while getting offer details");
    console.error(offerQuery.error);
    return res.status(400).json({
      errorMessage: `Could not pull data for offer ${offerId}. Error: ${offerQuery.error.message}`,
    });
  }

  const offerPage = offerQuery.data?.page;

  if (!offerPage) {
    console.error(`Offer page ${offerId} not found`);
    return res.status(400).json({ errorMessage: "Offer page not found" });
  }

  // Extract variant ID and price from offer attributes
  const variantId = offerPage.attributes.find((attr) => attr.attribute.slug === "offer-variant")
    ?.values[0]?.reference;

  if (!variantId) {
    console.error("Variant ID not found in offer attributes");
    return res.status(400).json({ errorMessage: "Variant ID not found in offer" });
  }

  const offerPriceAttribute = offerPage.attributes.find(
    (attr) => attr.attribute.slug === "offer-price"
  );
  const rawOfferPrice = offerPriceAttribute?.values[0]?.name;
  const offerPrice = JSON.parse(rawOfferPrice || "{}") as ParsedOfferPrice;

  if (!offerPrice?.amount) {
    console.error("Offer price not found in offer attributes");
    return res.status(400).json({ errorMessage: "Offer price not found" });
  }

  const createCheckoutMutation = await client
    .mutation(CreateExampleCheckoutDocument, {
      input: {
        email: "demo@saleor.io",
        billingAddress: {
          firstName: "John",
          lastName: "Doe",
          streetAddress1: "813 Howard Street",
          city: "Oswego",
          countryArea: "NY",
          postalCode: "13126",
          country: CountryCode.Us,
        },
        shippingAddress: {
          firstName: "John",
          lastName: "Doe",
          streetAddress1: "813 Howard Street",
          city: "Oswego",
          countryArea: "NY",
          postalCode: "13126",
          country: CountryCode.Us,
        },
        channel: DEFAULT_CHANNEL,
        lines: [
          {
            quantity: 1,
            variantId,
            price: offerPrice.amount,
          },
        ],
      },
    })
    .toPromise();

  if (createCheckoutMutation.error) {
    console.error(createCheckoutMutation.error);
    return res.status(400).json({
      errorMessage: `Could not create a new checkout. Error: ${createCheckoutMutation.error.message}`,
    });
  }

  const checkout = createCheckoutMutation.data?.checkoutCreate?.checkout;

  if (!checkout) {
    console.error("Checkout has not been created");
    return res.status(400).json({
      errorMessage: "Checkout has not been created",
    });
  }

  console.log("Checkout created: ", checkout.id);
  console.log(checkout);

  console.log("Setting delivery method");

  // write the offer id to checkout metadata
  const updateCheckoutMutation = await client
    .mutation(UpdateCheckoutMetadataDocument, {
      id: checkout.id,
      metadata: [
        { key: "offerId", value: offerId },
        { key: "offerName", value: offerPage.title },
      ],
    })
    .toPromise();

  if (updateCheckoutMutation.error) {
    console.error(updateCheckoutMutation.error);
    return res.status(400).json({
      errorMessage: `Could not update checkout metadata. Error: ${updateCheckoutMutation.error.message}`,
    });
  }

  const shippingMethodId = checkout.shippingMethods[0]?.id;

  if (!shippingMethodId) {
    console.error("Shipping method ID not found");
    return res.status(400).json({
      errorMessage: "Shipping method ID not found",
    });
  }

  const updateDeliveryMutation = await client
    .mutation(UpdateDeliveryDocument, {
      id: checkout.id,
      methodId: shippingMethodId,
    })
    .toPromise();

  if (updateDeliveryMutation.error) {
    console.error(updateDeliveryMutation.error);
    return res.status(400).json({
      errorMessage: `Could not update delivery. Error: ${updateDeliveryMutation.error.message}`,
    });
  }

  console.log("Completing checkout");

  const completeCheckoutMutation = await client
    .mutation(CompleteCheckoutDocument, {
      id: checkout.id,
    })
    .toPromise();

  if (completeCheckoutMutation.error) {
    console.error(completeCheckoutMutation.error);
    return res.status(400).json({
      errorMessage: `Could not complete checkout. Error: ${completeCheckoutMutation.error.message}`,
    });
  }

  console.log("Checkout completed");

  const orderId = completeCheckoutMutation.data?.checkoutComplete?.order?.id;

  if (!orderId) {
    console.error("Order ID not found");
    return res.status(400).json({
      errorMessage: "Order ID not found",
    });
  }

  return res.status(200).json({
    orderId,
  });
}
