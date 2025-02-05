import { Box } from "@saleor/macaw-ui/next";
import { NextPage } from "next";
import { StoresList } from "..";

const IndexPage: NextPage = () => {
  return (
    <Box padding={8}>
      <StoresList />
    </Box>
  );
};

export default IndexPage;
