import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="app-theme-page-bg h-screen w-full flex items-center justify-center">
      <div className="app-theme-surface p-10 rounded-xl shadow-md h-screen w-full">
        <Result
          status="404"
          title="404"
          subTitle="Sorry, the page you visited does not exist."
          extra={
            <Button type="primary" size="large" onClick={() => navigate("/")}>
              Go Back Home
            </Button>
          }
        />
      </div>
    </div>
  );
}

export default ErrorPage;
