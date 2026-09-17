// Funções globais para o painel TechShop

async function carregarVendas() {
  try {
    const res = await fetch('/api/vendas');
    const vendas = await res.json();
    const tbody = document.querySelector('#tabelaVendas tbody');
    if (!tbody) return;
    tbody.innerHTML = vendas.map(v => `
      <tr>
        <td>${v.id_pedido}</td>
        <td>${v.cliente}</td>
        <td>${v.total}</td>
        <td>${v.status}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar vendas:', e);
  }
}

async function carregarEstoque() {
  try {
    const res = await fetch('/api/estoque');
    const produtos = await res.json();
    const tbody = document.querySelector('#tabelaEstoque tbody');
    if (!tbody) return;
    tbody.innerHTML = produtos.map(p => `
      <tr>
        <td>${p.produto}</td>
        <td>
          <input type="number" id="input-${p.id}" value="${p.estoque}" style="width:70px;">
        </td>
        <td>${p.total_vendido} und</td>
        <td>
          <button type="button" onclick="salvarEstoque(event, '${p.id}')" style="background:#28a745;color:white;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;">
            Salvar
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar estoque:', e);
  }
}

async function salvarEstoque(event, id) {
  if (event) event.preventDefault();
  const input = document.getElementById(`input-${id}`);
  if (!input) return;
  const novoValor = Number(input.value);
  if (isNaN(novoValor)) {
    alert('Valor inválido.');
    return;
  }

  try {
    const res = await fetch(`/api/estoque/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estoque: novoValor })
    });

    if (res.ok) {
      alert('Estoque atualizado e gravado no MongoDB!');
      await carregarEstoque();
    } else {
      const erro = await res.json();
      alert(erro.erro || 'Erro ao salvar alteração.');
    }
  } catch (e) {
    alert('Falha na comunicação com o servidor.');
  }
}

async function carregarClientes() {
  try {
    const res = await fetch('/api/clientes');
    const clientes = await res.json();
    const tbody = document.querySelector('#tabelaClientes tbody');
    if (!tbody) return;
    tbody.innerHTML = clientes.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.nome}</td>
        <td>${c.email}</td>
        <td>${c.telefone || 'N/A'}</td>
        <td>
          <button type="button" onclick="excluirCliente(event, '${c.id}')" style="background:#dc3545;color:white;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;">
            Excluir
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar clientes:', e);
  }
}

async function excluirCliente(event, id) {
  if (event) event.preventDefault();
  if (!confirm('Deseja realmente remover este cliente?')) return;

  try {
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Cliente removido!');
      await carregarClientes();
    } else {
      const erro = await res.json();
      alert(erro.erro || 'Erro ao excluir cliente.');
    }
  } catch (e) {
    alert('Erro ao excluir cliente.');
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarVendas();
  carregarEstoque();
  carregarClientes();
});