import { useQuery } from "@tanstack/react-query";
import { createClient, fetchExchange } from "urql";
import { SALEOR_API_URL } from "./const";
import Link from "next/link";
import type { GetStorePagesQuery, GetStorePageTypeQuery } from "../generated/graphql";
import { GetStorePagesDocument, GetStorePageTypeDocument } from "../generated/graphql";

const getStorePageType = async (): Promise<GetStorePageTypeQuery> => {
  const client = createClient({
    url: SALEOR_API_URL,
    exchanges: [fetchExchange],
  });

  const result = await client.query(GetStorePageTypeDocument, {}).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("No data returned from the query");
  }

  return result.data;
};

const getStorePages = async (pageTypeId: string): Promise<GetStorePagesQuery> => {
  const client = createClient({
    url: SALEOR_API_URL,
    exchanges: [fetchExchange],
  });

  const result = await client.query(GetStorePagesDocument, { pageTypeId }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("No data returned from the query");
  }

  return result.data;
};

export const StoresList = () => {
  const { data: pageTypeData, isLoading: isLoadingPageType } = useQuery<
    GetStorePageTypeQuery,
    Error
  >({
    queryKey: ["store-page-type"],
    queryFn: getStorePageType,
  });

  const pageTypeId = pageTypeData?.pageTypes?.edges[0]?.node?.id;

  const {
    data: pagesData,
    isLoading: isLoadingPages,
    error,
  } = useQuery<GetStorePagesQuery, Error>({
    queryKey: ["store-pages", pageTypeId],
    queryFn: () => {
      if (!pageTypeId) {
        throw new Error("Store page type not found");
      }
      return getStorePages(pageTypeId);
    },
    enabled: !!pageTypeId,
  });

  if (isLoadingPageType || isLoadingPages) {
    return <div>Loading stores...</div>;
  }

  if (error) {
    return <div>Error loading stores: {error.message}</div>;
  }

  if (!pageTypeId) {
    return (
      <div>Store page type not found. Please create a page type with "store" in its name.</div>
    );
  }

  const stores = pagesData?.pages?.edges || [];

  if (stores.length === 0) {
    return <div>No store pages found. Please create some pages of type "store".</div>;
  }

  return (
    <div className="container">
      <h1 className="title">Our Stores</h1>
      <div className="stores-grid">
        {stores.map(({ node }) => (
          <Link key={node.id} href={`/stores/${node.id}`}>
            <div className="store-card">
              <h2 className="store-title">{node.title}</h2>
              <p className="store-slug">{node.slug}</p>
              <span className="visit-link">Visit Store →</span>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .title {
          font-size: 2.5rem;
          margin-bottom: 2rem;
          color: #1a1a1a;
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }

        .store-card {
          border: 2px solid gray;
          padding: 1.5rem;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
        }

        .store-card:hover {
          border-color: black;
        }

        .store-title {
          font-size: 1.5rem;
          margin: 0;
          color: #1a1a1a;
        }

        .store-slug {
          color: #6b7280;
          margin: 0;
          font-size: 0.875rem;
        }

        .store-card:hover .visit-link {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};
