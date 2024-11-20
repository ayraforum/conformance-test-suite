import React from "react";
import Header from "./Header";
import styled from "styled-components";

type LayoutProps = {
  children: React.ReactNode;
};

const Main = styled.main`
  margin-top: 70px; /* Adjust for fixed header height */
  padding: 20px;
`;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Header />
      <Main>{children}</Main>
    </>
  );
};

export default Layout;
