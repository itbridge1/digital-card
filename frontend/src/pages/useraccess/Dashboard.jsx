import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin } from 'antd';
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  IdcardOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useraccessAPI } from '../../services/api';

const { Title, Text } = Typography;

function UserAccessDashboard() {
  const [orgs, setOrgs] = useState([]);
  const [stats, setStats] = useState({ totalMembers: 0, totalTaps: 0 });
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    useraccessAPI
      .getOrganizations()
      .then(async (res) => {
        const organizations = res.data.data || [];
        setOrgs(organizations);

        const cardResponses = await Promise.all(
          organizations.map((org) =>
            useraccessAPI
              .getOrganizationCards(org.tenantId)
              .then((cardsRes) => cardsRes.data.data || [])
              .catch(() => []),
          ),
        );

        const allCards = cardResponses.flat();
        setStats({
          totalMembers: allCards.length,
          totalTaps: allCards.reduce(
            (sum, card) => sum + (Number(card.tapCount) || 0),
            0,
          ),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeOrgs = orgs.filter((o) => o.isActive).length;

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={4} style={{ marginBottom: 2, letterSpacing: '-0.02em' }}>
          Welcome back, {user.name}
        </Title>
        <Text style={{ color: '#64748b', fontSize: 13 }}>
          Manage organizations and their card holders from here.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="nfc-stat-card nfc-stat-card-primary">
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Total Organizations</span>}
              value={orgs.length}
              prefix={<ApartmentOutlined style={{ color: '#5046e5', marginRight: 4 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="nfc-stat-card nfc-stat-card-success">
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Active Organizations</span>}
              value={activeOrgs}
              prefix={<CheckCircleOutlined style={{ color: '#10b981', marginRight: 4 }} />}
              valueStyle={{ color: '#10b981', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="nfc-stat-card nfc-stat-card-primary">
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Total Members</span>}
              value={stats.totalMembers}
              prefix={<IdcardOutlined style={{ color: '#5046e5', marginRight: 4 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="nfc-stat-card nfc-stat-card-info">
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Total Card Taps</span>}
              value={stats.totalTaps}
              prefix={<ThunderboltOutlined style={{ color: '#0ea5e9', marginRight: 4 }} />}
              valueStyle={{ color: '#0ea5e9', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default UserAccessDashboard;
