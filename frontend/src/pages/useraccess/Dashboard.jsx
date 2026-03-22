import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin } from 'antd';
import { ApartmentOutlined, IdcardOutlined } from '@ant-design/icons';
import { useraccessAPI } from '../../services/api';

const { Title, Text } = Typography;

function UserAccessDashboard() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    useraccessAPI.getOrganizations().then((res) => {
      setOrgs(res.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const activeOrgs = orgs.filter((o) => o.isActive).length;

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>Welcome, {user.name}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Manage organizations and their card holders from here.
      </Text>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Total Organizations"
              value={orgs.length}
              prefix={<ApartmentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Active Organizations"
              value={activeOrgs}
              prefix={<IdcardOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default UserAccessDashboard;
