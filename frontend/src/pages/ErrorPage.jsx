import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
          border: "1px solid #e2e8f0",
          padding: "48px 40px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
        }}
      >
        <Result
          status="404"
          title="404"
          subTitle="Sorry, the page you visited does not exist."
          extra={
            <Button
              type="primary"
              size="large"
              onClick={() => navigate("/")}
              style={{
                background: "linear-gradient(135deg, #5046e5, #7c3aed)",
                border: "none",
                borderRadius: 10,
                height: 44,
                fontWeight: 600,
                paddingLeft: 28,
                paddingRight: 28,
              }}
            >
              Go Back Home
            </Button>
          }
        />
      </div>
    </div>
  );
}

export default ErrorPage;
