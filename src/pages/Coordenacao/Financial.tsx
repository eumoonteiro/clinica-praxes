import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  DollarSign,
  TrendingUp,
  Users,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Financial = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  useEffect(() => {
    const unsubPay = onSnapshot(collection(db, 'pagamentos'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPatients = onSnapshot(collection(db, 'pacientes'), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPay(); unsubPatients();
    };
  }, []);

  const currentMonthPayments = payments.filter(p => (p.paymentDate || '').startsWith(`${currentYear}-${currentMonth}`));
  const repasseRecebido = currentMonthPayments.filter(p => p.repasseConfirmado).reduce((acc, curr) => acc + curr.repasse, 0);
  const repassePendente = currentMonthPayments.filter(p => !p.repasseConfirmado).reduce((acc, curr) => acc + curr.repasse, 0);
  const totalPacientesAtivos = patients.filter(p => p.status === 'Ativo').length;

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '40px 0' }}>
      <div className="container">
        <button onClick={() => navigate('/coordenacao')} className="btn" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white' }}>
          <ArrowLeft size={18} /> Voltar
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 className="outfit">Financeiro da Clínica</h2>
          <span style={{ color: 'var(--text-muted)' }}>Mês Atual: {currentMonth}/{currentYear}</span>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '12px' }}><DollarSign size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Repasse Recebido (Mês)</span>
              <h3 className="outfit" style={{ color: '#16a34a' }}>R$ {repasseRecebido.toFixed(2)}</h3>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ background: '#fee2e2', color: '#ef4444', padding: '12px', borderRadius: '12px' }}><TrendingUp size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Repasse Pendente (Mês)</span>
              <h3 className="outfit" style={{ color: '#ef4444' }}>R$ {repassePendente.toFixed(2)}</h3>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--secondary)' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', padding: '12px', borderRadius: '12px' }}><Users size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pacientes Ativos</span>
              <h3 className="outfit">{totalPacientesAtivos}</h3>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="outfit" style={{ marginBottom: '20px' }}>Histórico Geral de Pagamentos</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Data</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Paciente</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Valor Total</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Repasse</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.sort((a,b) => b.paymentDate?.localeCompare(a.paymentDate)).map(pay => (
                  <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{pay.paymentDate ? new Date(pay.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{pay.patientName}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>R$ {pay.value.toFixed(2)}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>R$ {pay.repasse.toFixed(2)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '4px 10px', 
                        borderRadius: '100px', 
                        background: pay.repasseConfirmado ? '#dcfce7' : '#fee2e2', 
                        color: pay.repasseConfirmado ? '#16a34a' : '#ef4444',
                        fontWeight: 700
                      }}>
                        {pay.repasseConfirmado ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Financial;
