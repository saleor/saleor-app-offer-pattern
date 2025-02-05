import { useQuery } from "@tanstack/react-query";
import router, { useRouter } from "next/router";
import { useState } from "react";
import type {
  GetStoreOffersQuery,
  GetStorePageQuery,
  GetVariantQuery,
} from "../../../generated/graphql";
import {
  GetStoreOffersDocument,
  GetStorePageDocument,
  GetVariantDocument,
} from "../../../generated/graphql";
import { DEFAULT_CHANNEL, SALEOR_API_URL } from "../../const";
import { createClient } from "../../lib/create-graphql-client";
import { formatPrice } from "../../lib/format-price";
import { AddToCartResponseData } from "../api/add-to-cart";

const client = createClient(SALEOR_API_URL, async () => {
  // For frontend queries we don't need auth
  return Promise.resolve({ token: "" });
});

const getVariant = async (variantId: string): Promise<GetVariantQuery> => {
  const result = await client
    .query(GetVariantDocument, { id: variantId, channel: DEFAULT_CHANNEL })
    .toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("No data returned from the query");
  }

  return result.data;
};

const getStorePage = async (storeId: string): Promise<GetStorePageQuery> => {
  const result = await client.query(GetStorePageDocument, { id: storeId }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("No data returned from the query");
  }

  return result.data;
};

const getStoreOffers = async (offerIds: string[]): Promise<GetStoreOffersQuery> => {
  const result = await client.query(GetStoreOffersDocument, { ids: offerIds }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("No data returned from the query");
  }

  return result.data;
};

type OfferCardProps = NonNullable<NonNullable<GetStoreOffersQuery["pages"]>["edges"][0]>["node"];

type ParsedOfferPrice = {
  amount: number;
  currency: string;
};

const OfferCard = ({ id, title, slug, content, attributes }: OfferCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const variantId = attributes.find((attr) => attr.attribute.slug === "offer-variant")?.values[0]
    ?.reference;

  const offerPriceAttribute = attributes.find((attr) => attr.attribute.slug === "offer-price");
  const rawOfferPrice = offerPriceAttribute?.values[0]?.name;
  // this is formato of rawOfferPrice: {"amount": 14.99, "currency": "USD"}
  const offerPrice = JSON.parse(rawOfferPrice || "{}") as ParsedOfferPrice;

  const { data: variantData } = useQuery<GetVariantQuery>({
    queryKey: ["variant", variantId],
    queryFn: () => getVariant(variantId || ""),
    enabled: !!variantId,
  });

  const basePrice = variantData?.productVariant?.pricing?.price?.gross;

  const handleBuyClick = async () => {
    if (!id || !offerPrice) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/add-to-cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId: id,
          quantity: 1,
        }),
      });

      const data = (await response.json()) as AddToCartResponseData;

      if ("errorMessage" in data) {
        console.error("Error adding to cart:", data.errorMessage);
        // You might want to show an error message to the user here
        return;
      }

      // You might want to show a success message or redirect to cart here
      console.log("Successfully created order:", data.orderId);
      // remove /graphql from SALEOR_API_URL
      const rootPage = SALEOR_API_URL.replace("/graphql/", "");
      console.log(rootPage);
      // redirect to order page
      const orderPage = `${rootPage}/dashboard/orders/${data.orderId}`;
      console.log(orderPage);
      // open in new tab
      window.open(orderPage, "_blank");
    } catch (error) {
      console.error("Error adding to cart:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="offer-card">
      <h3 className="offer-title">{title}</h3>
      <p className="offer-slug">{slug}</p>
      {content && <p className="offer-content">{content}</p>}
      {
        <p className="offer-price">
          Base Price: {basePrice ? formatPrice(basePrice.amount) : "$??.??"}
        </p>
      }
      {<p className="offer-price">Offer Price: {formatPrice(offerPrice.amount)}</p>}
      <button
        onClick={handleBuyClick}
        disabled={!id || !offerPrice || isLoading}
        className="buy-button"
      >
        {isLoading ? "Adding to cart..." : "Buy at Offer Price"}
      </button>

      <style jsx>{`
        .offer-card {
          border: 2px solid gray;
          padding: 1.5rem;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .offer-card:hover {
          border-color: black;
        }

        .offer-title {
          font-size: 1.5rem;
          margin: 0;
          color: #1a1a1a;
        }

        .offer-slug {
          color: #6b7280;
          margin: 0;
          font-size: 0.875rem;
        }

        .offer-content {
          color: #4b5563;
          margin: 0.5rem 0;
          font-size: 0.875rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .offer-price {
          font-size: 1.25rem;
          color: #1a1a1a;
          margin: 0;
        }

        .buy-button {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background-color: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.25rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
          min-width: 200px;
        }

        .buy-button:hover {
          background-color: #333;
        }

        .buy-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

const StorePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const storeId = typeof id === "string" ? id : undefined;

  const { data: pageData, isLoading: isLoadingPage } = useQuery<GetStorePageQuery>({
    queryKey: ["storePage", storeId],
    queryFn: () => getStorePage(storeId || ""),
    enabled: !!storeId,
  });

  const storeOfferIds =
    pageData?.page?.attributes
      .find((attr) => attr.attribute.slug === "store-offers")
      ?.values.map((value) => value.reference)
      .filter((ref): ref is string => typeof ref === "string") || [];

  const { data: offersData, isLoading: isLoadingOffers } = useQuery<GetStoreOffersQuery>({
    queryKey: ["storeOffers", storeOfferIds],
    queryFn: () => getStoreOffers(storeOfferIds),
    enabled: storeOfferIds.length > 0,
  });

  if (isLoadingPage) {
    return <div>Loading store details...</div>;
  }

  if (!pageData?.page) {
    return <div>Store not found</div>;
  }

  return (
    <div className="container">
      <h1 className="title">{pageData.page.title}</h1>

      {isLoadingOffers ? (
        <div>Loading offers...</div>
      ) : (
        <div className="offers-grid">
          {offersData?.pages?.edges.map(({ node }) => (
            <OfferCard
              key={node.id}
              id={node.id}
              title={node.title}
              slug={node.slug}
              content={node.content}
              attributes={node.attributes}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .title {
          font-size: 2.5rem;
          margin-bottom: 2rem;
          color: #1a1a1a;
        }

        .offers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }
      `}</style>
    </div>
  );
};

export default StorePage;
