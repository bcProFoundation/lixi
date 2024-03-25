import EmptyLayout from '@components/Layout/EmptyLayout';
import { Button } from 'antd';
import styled from 'styled-components';

const FourOhFourComponent = () => {
  const FourOhFour = styled.div`
    background: var(--bg-color-light-theme);
    .container {
      font-family: sans-serif;
      height: 100vh;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      img {
        margin-bottom: 5px;
      }
      h1 {
        font-weight: bold;
        font-size: 2.5em;
        margin-top: 1em;
        margin-bottom: 0px;
      }
      img {
        width: 100%;
        max-width: 1067px;
      }
      .button {
        margin-top: 0.5em;
        min-width: 150px;
      }
    }
  `;
  return (
    <FourOhFour>
      <div className="container">
        <img src="/images/404.png" alt="404" />
        <h1>Opps! Page not found</h1>
        <h3>Sorry, we can’t find the page you’re looking for.</h3>
        <Button className="button" type="primary" onClick={() => window.open('/', '_self')}>
          Go back
        </Button>
      </div>
    </FourOhFour>
  );
};

const FourOhFourPage = () => {
  return <FourOhFourComponent />;
};

FourOhFourPage.getLayout = (page) => (
  <EmptyLayout>{page}</EmptyLayout>
);

export default FourOhFourPage;
