import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

export default function Membership() {
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadMembership() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error('Could not load membership:', error);
        setErrorMessage('CourtStreak could not load your membership.');
      } else {
        setSubscription(data);
      }

      setLoading(false);
    }

    loadMembership();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleManageMembership() {
    if (membershipLoading) return;

    setMembershipLoading(true);

    try {
      const returnUrl =
        window.location.origin +
        import.meta.env.BASE_URL +
        'membership';

      const { data, error } = await supabase.functions.invoke(
        'create-customer-portal',
        {
          body: { returnUrl },
        }
      );

      if (error) throw error;

      if (!data?.url) {
        throw new Error('Stripe did not return a customer portal URL.');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Could not open membership management:', error);
      alert('Could not open membership management. Please try again.');
      setMembershipLoading(false);
    }
  }

  const status = subscription?.status || 'active';
  const isActive =
    status === 'active' || status === 'trialing';

  const nextPaymentDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(
        'en-US',
        {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }
      )
    : 'Available through billing portal';

  if (loading) {
    return (
      <main style={styles.page}>
        <p style={styles.loadingText}>Loading your membership...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.topbar}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={styles.backButton}
        >
          <ArrowLeft size={19} />
          Dashboard
        </button>

        <Link to="/" style={styles.brand}>
          CourtStreak
        </Link>

        <span style={styles.topbarSpacer} />
      </header>

      <section style={styles.container}>
        <div style={styles.heading}>
          <span style={styles.eyebrow}>ACCOUNT & BILLING</span>
          <h1 style={styles.title}>Your Membership</h1>
          <p style={styles.subtitle}>
            View your plan, billing information, invoices, or cancel
            your membership.
          </p>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>{errorMessage}</div>
        )}

        <section style={styles.membershipCard}>
          <div style={styles.cardTop}>
            <div>
              <div style={styles.statusRow}>
                <span style={styles.planLabel}>
                  COURTSTREAK MONTHLY
                </span>

                <span
                  style={{
                    ...styles.statusBadge,
                    ...(isActive
                      ? styles.activeBadge
                      : styles.inactiveBadge),
                  }}
                >
                  <CheckCircle2 size={15} />
                  {isActive ? 'Active' : status}
                </span>
              </div>

              <h2 style={styles.price}>
                $29.99
                <span style={styles.pricePeriod}> / month</span>
              </h2>

              <p style={styles.planDescription}>
  Full access to CourtStreak training, progress tracking,
  achievements, challenges, and Training Circles. Your membership
  renews automatically each month until canceled.
</p>
            </div>

            
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <Users size={22} color="#ff7518" />

              <div>
                <span style={styles.detailLabel}>
                  Players covered
                </span>
                <strong style={styles.detailValue}>1 player</strong>
              </div>
            </div>

            <div style={styles.detailItem}>
              <CreditCard size={22} color="#ff7518" />

              <div>
                <span style={styles.detailLabel}>
                  Billing schedule
                </span>
                <strong style={styles.detailValue}>Monthly</strong>
              </div>
            </div>

            <div style={styles.detailItem}>
              <Receipt size={22} color="#ff7518" />

              <div>
                <span style={styles.detailLabel}>
                  Next payment
                </span>
                <strong style={styles.detailValue}>
                  {nextPaymentDate}
                </strong>
              </div>
            </div>
          </div>

          <div style={styles.managementBox}>
            <div style={styles.managementText}>
              <ShieldCheck size={25} color="#ff7518" />

              <div>
                <h3 style={styles.managementTitle}>
                  Payment and cancellation
                </h3>

                <p style={styles.managementDescription}>
                  Update your payment method, view invoices, or cancel
                  your membership securely through Stripe.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManageMembership}
              disabled={membershipLoading}
              style={{
                ...styles.manageButton,
                opacity: membershipLoading ? 0.7 : 1,
              }}
            >
              {membershipLoading
                ? 'Opening Billing Portal...'
                : 'Manage or Cancel Membership'}

              {!membershipLoading && <ExternalLink size={18} />}
            </button>
          </div>
        </section>

        <p style={styles.helpText}>
  Need help with your membership? Contact CourtStreak support.
</p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top right, rgba(255,117,24,0.08), transparent 35%), #050b19',
    color: '#ffffff',
    fontFamily: 'inherit',
  },

  loadingText: {
    margin: 0,
    padding: '80px 24px',
    textAlign: 'center',
    color: '#9aa7bd',
  },

  topbar: {
    minHeight: '84px',
    padding: '0 24px',
    borderBottom: '1px solid rgba(148,163,184,0.13)',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
  },

  backButton: {
    width: 'fit-content',
    padding: 0,
    border: 0,
    background: 'transparent',
    color: '#b6c0d2',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  brand: {
    color: '#ffffff',
    fontSize: '25px',
    fontWeight: 900,
    textDecoration: 'none',
  },

  topbarSpacer: {
    display: 'block',
  },

  container: {
    width: 'min(920px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '70px 0',
  },

  heading: {
    marginBottom: '30px',
  },

  eyebrow: {
    color: '#ff7518',
    fontSize: '13px',
    fontWeight: 900,
    letterSpacing: '2px',
  },

  title: {
    margin: '10px 0 10px',
    fontSize: 'clamp(36px, 6vw, 58px)',
    lineHeight: 1,
  },

  subtitle: {
    maxWidth: '650px',
    margin: 0,
    color: '#9aa7bd',
    fontSize: '17px',
    lineHeight: 1.6,
  },

  errorBox: {
    marginBottom: '20px',
    padding: '16px',
    border: '1px solid rgba(248,113,113,0.35)',
    borderRadius: '14px',
    background: 'rgba(127,29,29,0.18)',
    color: '#fecaca',
  },

  membershipCard: {
    overflow: 'hidden',
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: '28px',
    background:
      'linear-gradient(145deg, rgba(16,26,47,0.98), rgba(9,15,31,0.98))',
    boxShadow: '0 30px 70px rgba(0,0,0,0.28)',
  },

  cardTop: {
  padding: '34px',
},

  statusRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
  },

  planLabel: {
    color: '#ff8a35',
    fontSize: '13px',
    fontWeight: 900,
    letterSpacing: '1.7px',
  },

  statusBadge: {
    padding: '7px 11px',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 800,
    textTransform: 'capitalize',
  },

  activeBadge: {
    background: 'rgba(34,197,94,0.13)',
    color: '#86efac',
    border: '1px solid rgba(34,197,94,0.3)',
  },

  inactiveBadge: {
    background: 'rgba(248,113,113,0.13)',
    color: '#fca5a5',
    border: '1px solid rgba(248,113,113,0.3)',
  },

  price: {
    margin: '22px 0 12px',
    fontSize: '44px',
  },

  pricePeriod: {
    color: '#9aa7bd',
    fontSize: '18px',
    fontWeight: 600,
  },

  planDescription: {
    maxWidth: '600px',
    margin: 0,
    color: '#9aa7bd',
    lineHeight: 1.6,
  },

  logoMark: {
    width: '66px',
    height: '66px',
    flexShrink: 0,
    border: '2px solid #ff7518',
    borderRadius: '20px',
    display: 'grid',
    placeItems: 'center',
    color: '#ffffff',
    fontSize: '21px',
    fontWeight: 900,
    boxShadow: '0 0 30px rgba(255,117,24,0.16)',
  },

  detailsGrid: {
    padding: '0 34px 34px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
  },

  detailItem: {
    minHeight: '82px',
    padding: '18px',
    border: '1px solid rgba(148,163,184,0.14)',
    borderRadius: '16px',
    background: 'rgba(4,10,24,0.42)',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },

  detailLabel: {
    display: 'block',
    marginBottom: '4px',
    color: '#7f8ca4',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },

  detailValue: {
    color: '#ffffff',
    fontSize: '16px',
  },

  managementBox: {
    padding: '26px 34px',
    borderTop: '1px solid rgba(255,117,24,0.22)',
    background: 'rgba(255,117,24,0.055)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '22px',
  },

  managementText: {
    maxWidth: '510px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  },

  managementTitle: {
    margin: '0 0 6px',
    fontSize: '18px',
  },

  managementDescription: {
    margin: 0,
    color: '#9aa7bd',
    lineHeight: 1.5,
  },

  manageButton: {
    minHeight: '52px',
    padding: '0 20px',
    border: 0,
    borderRadius: '13px',
    background: '#ff6810',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: 900,
    cursor: 'pointer',
  },

  helpText: {
    margin: '20px 0 0',
    color: '#748198',
    textAlign: 'center',
    fontSize: '13px',
  },
};