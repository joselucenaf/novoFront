class APIService {
    constructor() {
        this.baseURL = 'http://localhost:8080/api';
    }

    async fazerRequisicao(endpoint, metodo = 'GET', dados = null) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (dados && (metodo === 'POST' || metodo === 'PUT' || metodo === 'PATCH')) {
            config.body = JSON.stringify(dados);
        }

        try {
            const resposta = await fetch(url, config);
            
            if (!resposta.ok) {
                const erro = await resposta.json();
                throw new Error(erro.message || `Erro HTTP: ${resposta.status}`);
            }

            if (resposta.status === 204) {
                return null;
            }

            return await resposta.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }
}

class PedidoService {
    constructor() {
        this.apiService = new APIService();
    }


    async criarPedido(pedidoData) {

        const pedidoRequest = {
            cliente: pedidoData.cliente,
            tipoCha: this.mapearTipoChaParaBackend(pedidoData.cha),
            tamanho: this.mapearTamanhoParaBackend(pedidoData.tamanho),
            observacoes: pedidoData.observacoes || '',
            preco: pedidoData.preco
        };

        return await this.apiService.fazerRequisicao('/pedidos', 'POST', pedidoRequest);
    }

    async listarPedidos(filtros = {}) {
        const params = new URLSearchParams();
        
        if (filtros.cliente) {
            params.append('cliente', filtros.cliente);
        }
        
        if (filtros.status && filtros.status !== 'all') {
            params.append('status', this.mapearStatusParaBackend(filtros.status));
        }
        
        if (filtros.data && filtros.data !== 'all') {
            const data = this.obterDataParaFiltro(filtros.data);
            if (data) {
                params.append('data', data);
            }
        }
        
        const queryString = params.toString();
        const endpoint = queryString ? `/pedidos?${queryString}` : '/pedidos';
        
        const pedidos = await this.apiService.fazerRequisicao(endpoint);
        
        return pedidos.map(pedido => this.mapearPedidoParaFrontend(pedido));
    }

    async buscarPedidoPorId(id) {
        const pedido = await this.apiService.fazerRequisicao(`/pedidos/${id}`);
        return this.mapearPedidoParaFrontend(pedido);
    }

    async atualizarPedido(id, dadosAtualizados) {
        const atualizacaoRequest = {
            cliente: dadosAtualizados.cliente,              //atualizar os dados do pedido
            tipoCha: dadosAtualizados.tipoCha,
            tamanho: dadosAtualizados.tamanho,
            observacoes: dadosAtualizados.observacoes || ''
        };

        const pedidoAtualizado = await this.apiService.fazerRequisicao(
            `/pedidos/${id}`, 
            'PUT', 
            atualizacaoRequest
        );
        return this.mapearPedidoParaFrontend(pedidoAtualizado);
    }

    async atualizarStatusPedido(id, novoStatus) {
        const statusBackend = this.mapearStatusParaBackend(novoStatus);
        const pedidoAtualizado = await this.apiService.fazerRequisicao(
            `/pedidos/${id}/status?novoStatus=${statusBackend}`,
            'PATCH'
        );
        return this.mapearPedidoParaFrontend(pedidoAtualizado);
    }

    async excluirPedido(id) {
        await this.apiService.fazerRequisicao(`/pedidos/${id}`, 'DELETE');
        return { id };
    }

    async limparTodosPedidos() {
        const pedidos = await this.listarPedidos();
        for (const pedido of pedidos) {
            await this.excluirPedido(pedido.id);
        }
        return pedidos.length;
    }

    async obterEstatisticas() {
        try {
            const estatisticas = await this.apiService.fazerRequisicao('/pedidos/estatisticas');
            return {
                total: estatisticas.totalPedidos || 0,
                hoje: estatisticas.pedidosHoje || 0,
                receitaTotal: estatisticas.receitaTotal || 0,
                receitaHoje: estatisticas.receitaHoje || 0
            };
        } catch (error) {
            console.warn('Erro ao obter estatísticas, retornando valores padrão:', error);
            return {
                total: 0,
                hoje: 0,
                receitaTotal: 0,
                receitaHoje: 0
            };
        }
    }

    mapearTipoChaParaBackend(chaFrontend) {
        const mapeamento = {
            'cha-verde': 'CHA_VERDE',
            'manga-morango': 'MANGA_MORANGO',
            'milk-tea': 'MILK_TEA'
        };
        return mapeamento[chaFrontend] || 'CHA_VERDE';
    }

    mapearTipoChaParaFrontend(chaBackend) {
        const mapeamento = {
            'CHA_VERDE': 'cha-verde',
            'MANGA_MORANGO': 'manga-morango',
            'MILK_TEA': 'milk-tea'
        };
        return mapeamento[chaBackend] || 'cha-verde';
    }

    mapearTamanhoParaBackend(tamanhoFrontend) {
        const mapeamento = {
            'pequeno': 'PEQUENO',
            'medio': 'MEDIO',
            'grande': 'GRANDE'
        };
        return mapeamento[tamanhoFrontend] || 'MEDIO';
    }

    mapearTamanhoParaFrontend(tamanhoBackend) {
        const mapeamento = {
            'PEQUENO': 'pequeno',
            'MEDIO': 'medio',
            'GRANDE': 'grande'
        };
        return mapeamento[tamanhoBackend] || 'medio';
    }

    mapearStatusParaBackend(statusFrontend) {
        const mapeamento = {
            'pendente': 'PENDENTE',
            'preparando': 'PREPARANDO',
            'pronto': 'PRONTO',
            'entregue': 'ENTREGUE',
            'cancelado': 'CANCELADO'
        };
        return mapeamento[statusFrontend] || 'PENDENTE';
    }

    mapearStatusParaFrontend(statusBackend) {
        const mapeamento = {
            'PENDENTE': 'pendente',
            'PREPARANDO': 'preparando',
            'PRONTO': 'pronto',
            'ENTREGUE': 'entregue',
            'CANCELADO': 'cancelado'
        };
        return mapeamento[statusBackend] || 'pendente';
    }

    mapearPedidoParaFrontend(pedidoBackend) {
        return {
            id: pedidoBackend.id,
            cliente: pedidoBackend.cliente,
            cha: this.mapearTipoChaParaFrontend(pedidoBackend.tipoCha),
            tamanho: this.mapearTamanhoParaFrontend(pedidoBackend.tamanho),
            preco: pedidoBackend.preco,
            observacoes: pedidoBackend.observacoes || '',
            status: this.mapearStatusParaFrontend(pedidoBackend.status),
            data: pedidoBackend.dataPedido  
        };
    }

    obterDataParaFiltro(tipoFiltro) {
        const hoje = new Date();
        
        switch(tipoFiltro) {
            case 'hoje':
                return hoje.toISOString().split('T')[0]; 
            case 'ontem':
                const ontem = new Date(hoje);
                ontem.setDate(ontem.getDate() - 1);
                return ontem.toISOString().split('T')[0];
            case 'semana':
                const semanaPassada = new Date(hoje);
                semanaPassada.setDate(semanaPassada.getDate() - 7);
                return semanaPassada.toISOString().split('T')[0];
            default:
                return null;
        }
    }
}

class ToastService {
    constructor() {
        this.toastCount = 0;
        this.estilosAdicionados = false;
        this.adicionarEstilos();
    }

    adicionarEstilos() {
        if (this.estilosAdicionados) return;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        this.estilosAdicionados = true;
    }

    mostrar(mensagem, tipo = 'info', duracao = 3000) {
        this.toastCount++;
        const toastId = `toast-${Date.now()}-${this.toastCount}`;
        const offset = (this.toastCount - 1) * 70;
        
        const configs = {
            sucesso: { cor: '#4caf50', icone: 'fa-check-circle', titulo: 'Sucesso' },
            erro: { cor: '#f44336', icone: 'fa-exclamation-circle', titulo: 'Erro' },
            info: { cor: '#2196f3', icone: 'fa-info-circle', titulo: 'Informação' },
            aviso: { cor: '#ff9800', icone: 'fa-exclamation-triangle', titulo: 'Aviso' }
        };
        
        const config = configs[tipo] || configs.info;
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.style.cssText = `
            position: fixed;
            bottom: ${20 + offset}px;
            right: 20px;
            background: linear-gradient(135deg, ${config.cor}, ${config.cor}dd);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            max-width: 350px;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease ${duracao - 300}ms forwards;
            border-left: 5px solid ${config.cor};
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <i class="fas ${config.icone}" style="font-size: 1.2rem; margin-right: 10px;"></i>
                <strong style="font-size: 1.1rem;">${config.titulo}</strong>
            </div>
            <div style="font-size: 0.95rem;">
                ${mensagem}
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => {
                    if (toastElement.parentNode) {
                        toastElement.parentNode.removeChild(toastElement);
                        this.toastCount--;
                        this.reorganizarToasts();
                    }
                }, 300);
            }
        }, duracao);
        
        return toastId;
    }

    reorganizarToasts() {
        const toasts = document.querySelectorAll('[id^="toast-"]');
        toasts.forEach((toast, index) => {
            toast.style.bottom = `${20 + (index * 70)}px`;
        });
    }
}

class PedidoController {
    constructor() {
        this.pedidoService = new PedidoService();
        this.toastService = new ToastService();
        this.modoEdicao = false;
        this.pedidoEditando = null;
        this.inicializarElementos();
        this.configurarEventos();
        this.inicializar();
    }

    inicializarElementos() {
        this.tabCriar = document.getElementById('tab-criar');
        this.tabVer = document.getElementById('tab-ver');
        this.criarPedidoSection = document.getElementById('criar-pedido');
        this.verPedidosSection = document.getElementById('ver-pedidos');
        
        this.pedidoForm = document.getElementById('pedido-form');
        this.pedidoId = document.getElementById('pedido-id');
        this.nomeCliente = document.getElementById('nome-cliente');
        this.observacoes = document.getElementById('observacoes');
        this.tipoChaRadios = document.querySelectorAll('input[name="tipo-cha"]');
        this.tamanhoRadios = document.querySelectorAll('input[name="tamanho"]');
        
        
        this.formTitle = document.getElementById('form-title');
        this.resumoCliente = document.getElementById('resumo-cliente');
        this.resumoCha = document.getElementById('resumo-cha');                 // Resumo do pedido
        this.resumoTamanho = document.getElementById('resumo-tamanho');
        this.resumoPreco = document.getElementById('resumo-preco');
        this.resumoTotal = document.getElementById('resumo-total');
        
        
        this.btnSubmit = document.getElementById('btn-submit');
        this.btnCancelar = document.getElementById('btn-cancelar');             // Botões do formulário
        this.btnLimpar = document.getElementById('btn-limpar');
        
        
        this.pedidosGrid = document.getElementById('pedidos-grid');         // Lista de pedidos
        this.noPedidos = document.getElementById('no-pedidos');
        

        this.filterCliente = document.getElementById('filter-cliente');
        this.filterStatus = document.getElementById('filter-status');
        this.filterData = document.getElementById('filter-data');               //filtros
        this.btnAtualizar = document.getElementById('btn-atualizar');
        
        this.totalPedidos = document.getElementById('total-pedidos');
        this.pedidosHoje = document.getElementById('pedidos-hoje');
        this.receitaHoje = document.getElementById('receita-hoje');
        this.totalReceita = document.getElementById('total-receita');
        
        this.btnLimparTodos = document.getElementById('btn-limpar-todos');
    
        this.chaNomes = {
            'cha-verde': 'Chá Verde',
            'manga-morango': 'Chá de Manga com Morango',
            'milk-tea': 'Milk Tea Clássico'
        };
        
        this.tamanhoNomes = {
            'pequeno': 'Pequeno (300ml)',
            'medio': 'Médio (500ml)',
            'grande': 'Grande (700ml)'
        };
        
        this.precos = {
            'pequeno': 15.00,
            'medio': 17.00,
            'grande': 20.00
        };
        
        this.statusInfo = {
            'pendente': { nome: 'Pendente', cor: '#ff9800', icon: 'fa-clock' },
            'preparando': { nome: 'Preparando', cor: '#2196f3', icon: 'fa-blender' },
            'pronto': { nome: 'Pronto', cor: '#4caf50', icon: 'fa-check' },
            'entregue': { nome: 'Entregue', cor: '#9c27b0', icon: 'fa-mug-hot' },
            'cancelado': { nome: 'Cancelado', cor: '#f44336', icon: 'fa-times' }
        };
    }

    configurarEventos() {
        this.tabCriar.addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarAba('criar');
        });

        this.tabVer.addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarAba('ver');
        });
        this.pedidoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarPedido();
        });

        this.nomeCliente.addEventListener('input', () => this.atualizarResumo());
        this.observacoes.addEventListener('input', () => this.atualizarResumo());
        
        this.tipoChaRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.atualizarResumo();
                this.atualizarSelecaoCha();
            });
        });
        
        this.tamanhoRadios.forEach(radio => {
            radio.addEventListener('change', () => this.atualizarResumo());
        });
        document.querySelectorAll('.cha-card').forEach(card => {
            card.addEventListener('click', () => {
                const radio = card.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    this.atualizarResumo();
                    this.atualizarSelecaoCha();
                }
            });
        });

                                        // Botões 
        this.btnCancelar.addEventListener('click', () => this.cancelarEdicao());
        this.btnLimpar.addEventListener('click', () => this.limparFormulario());
        this.filterCliente.addEventListener('input', () => this.atualizarListaPedidos());
        this.filterStatus.addEventListener('change', () => this.atualizarListaPedidos());
        this.filterData.addEventListener('change', () => this.atualizarListaPedidos());
        this.btnAtualizar.addEventListener('click', () => this.atualizarListaPedidos());
        this.btnLimparTodos.addEventListener('click', () => this.limparTodosPedidos());
    }

    async inicializar() {
        this.atualizarResumo();
        this.atualizarSelecaoCha();
        await this.atualizarInterface();
    }

    mostrarAba(aba) {
        this.tabCriar.classList.remove('active');
        this.tabVer.classList.remove('active');
        
        if (aba === 'criar') {
            this.tabCriar.classList.add('active');
            this.criarPedidoSection.classList.add('active');
            this.verPedidosSection.classList.remove('active');
        } else {
            this.tabVer.classList.add('active');
            this.criarPedidoSection.classList.remove('active');
            this.verPedidosSection.classList.add('active');
            this.atualizarListaPedidos();
        }
    }

    atualizarSelecaoCha() {
        document.querySelectorAll('.cha-card').forEach(card => {
            card.classList.remove('selected');
            const radio = card.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                card.classList.add('selected');
            }
        });
    }

    atualizarResumo() {
        const cliente = this.nomeCliente.value.trim() || '--';
        this.resumoCliente.textContent = cliente;
        

        let chaSelecionado = '--';
        this.tipoChaRadios.forEach(radio => {
            if (radio.checked) {
                chaSelecionado = this.chaNomes[radio.value];
            }
        });
        this.resumoCha.textContent = chaSelecionado;
        
        let tamanhoSelecionado = '--';
        let preco = 0;
        this.tamanhoRadios.forEach(radio => {
            if (radio.checked) {
                tamanhoSelecionado = this.tamanhoNomes[radio.value];
                preco = this.precos[radio.value];
            }
        });
        this.resumoTamanho.textContent = tamanhoSelecionado;
        this.resumoPreco.textContent = `R$ ${preco.toFixed(2)}`;
        this.resumoTotal.textContent = `R$ ${preco.toFixed(2)}`;
    }

    validarFormulario() {
        let valido = true;
        let mensagens = [];
                                                                            //validações
        if (!this.nomeCliente.value.trim()) {
            mensagens.push('Por favor, insira o nome do cliente');
            this.nomeCliente.focus();
            valido = false;
        } else if (this.nomeCliente.value.trim().length < 2) {
            mensagens.push('O nome do cliente deve ter pelo menos 2 caracteres');
            this.nomeCliente.focus();
            valido = false;
        }
        
        const chaSelecionado = document.querySelector('input[name="tipo-cha"]:checked');
        if (!chaSelecionado) {
            mensagens.push('Por favor, selecione um tipo de chá');
            valido = false;
        }
        
        const tamanhoSelecionado = document.querySelector('input[name="tamanho"]:checked');
        if (!tamanhoSelecionado) {
            mensagens.push('Por favor, selecione um tamanho de copo');
            valido = false;
        }
        
        if (!valido) {
            mensagens.forEach(msg => this.toastService.mostrar(msg, 'erro'));
        }
        
        return valido;
    }

    async salvarPedido() {
        if (!this.validarFormulario()) return;
        
        const pedidoData = {
            cliente: this.nomeCliente.value.trim(),
            cha: document.querySelector('input[name="tipo-cha"]:checked').value,
            tamanho: document.querySelector('input[name="tamanho"]:checked').value,
            observacoes: this.observacoes.value.trim(),
            preco: this.precos[document.querySelector('input[name="tamanho"]:checked').value]
        };
        
        try {
            let resultado;
            
            if (this.modoEdicao) {
                const dadosAtualizacao = {
                    cliente: pedidoData.cliente,
                    tipoCha: this.pedidoService.mapearTipoChaParaBackend(pedidoData.cha),
                    tamanho: this.pedidoService.mapearTamanhoParaBackend(pedidoData.tamanho),
                    observacoes: pedidoData.observacoes
                };
                
                resultado = await this.pedidoService.atualizarPedido(this.pedidoEditando.id, dadosAtualizacao);
                this.toastService.mostrar(
                    `Pedido ID ${resultado.id} atualizado com sucesso!`,
                    'sucesso'
                );
                this.cancelarEdicao();
            } else {
                                //criar pedido
                resultado = await this.pedidoService.criarPedido(pedidoData);
                this.toastService.mostrar(
                    `Pedido ID ${resultado.id} criado com sucesso!<br>
                    Cliente: ${resultado.cliente}<br>
                    Valor: R$ ${resultado.preco.toFixed(2)}`,
                    'sucesso'
                );
                this.limparFormulario();
            }
            
            await this.atualizarInterface();
            
        } catch (error) {
            this.toastService.mostrar(
                `Erro ao ${this.modoEdicao ? 'atualizar' : 'criar'} pedido: ${error.message}`,
                'erro'
            );
        }
    }

    prepararEdicao(pedido) {
        this.modoEdicao = true;
        this.pedidoEditando = pedido;
        this.pedidoId.value = pedido.id;
        this.nomeCliente.value = pedido.cliente;
        this.observacoes.value = pedido.observacoes || '';
        
        const chaMap = {
            'cha-verde': 'cha-verde',
            'manga-morango': 'manga-morango', 
            'milk-tea': 'milk-tea',
            'CHA_VERDE': 'cha-verde',
            'MANGA_MORANGO': 'manga-morango',
            'MILK_TEA': 'milk-tea'
        };
        
        const chaValue = chaMap[pedido.cha] || 'cha-verde';
        document.querySelectorAll('input[name="tipo-cha"]').forEach(radio => {
            radio.checked = (radio.value === chaValue);
        });
        
        
        const tamanhoMap = {
            'pequeno': 'pequeno',
            'medio': 'medio',
            'grande': 'grande',
            'PEQUENO': 'pequeno',
            'MEDIO': 'medio',
            'GRANDE': 'grande'
        };
        
        const tamanhoValue = tamanhoMap[pedido.tamanho] || 'medio';
        document.querySelectorAll('input[name="tamanho"]').forEach(radio => {
            radio.checked = (radio.value === tamanhoValue);
        });
        
                        //editar/atualizar algum item na interface
        this.formTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Pedido';
        this.btnSubmit.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
        this.btnCancelar.style.display = 'inline-flex';
        
        this.atualizarResumo();
        this.atualizarSelecaoCha();
        this.mostrarAba('criar');
    }

    cancelarEdicao() {
        this.modoEdicao = false;
        this.pedidoEditando = null;
        
        this.formTitle.innerHTML = '<i class="fas fa-plus-square"></i> Novo Pedido';
        this.btnSubmit.innerHTML = '<i class="fas fa-check-circle"></i> Criar Pedido';
        this.btnCancelar.style.display = 'none';
        
        this.limparFormulario();
    }

    limparFormulario() {
        this.pedidoForm.reset();
        this.observacoes.value = '';
        this.pedidoId.value = '';
        this.atualizarResumo();
        this.atualizarSelecaoCha();
    }

    async atualizarListaPedidos() {
        const filtros = {
            cliente: this.filterCliente.value.trim(),
            status: this.filterStatus.value,
            data: this.filterData.value
        };
        
        try {
            const pedidos = await this.pedidoService.listarPedidos(filtros);
            this.renderizarPedidos(pedidos);
        } catch (error) {
            this.toastService.mostrar(`Erro ao carregar pedidos: ${error.message}`, 'erro');
        }
    }

    renderizarPedidos(pedidos) {
        this.pedidosGrid.innerHTML = '';
        
        if (pedidos.length === 0) {
            this.pedidosGrid.appendChild(this.noPedidos.cloneNode(true));
            return;
        }
        
        pedidos.forEach(pedido => {
            const card = this.criarCardPedido(pedido);
            this.pedidosGrid.appendChild(card);
        });
    }

    criarCardPedido(pedido) {
        const status = this.statusInfo[pedido.status];
        const dataFormatada = this.formatarData(pedido.data);
        
        const card = document.createElement('div');
        card.className = 'pedido-card';
        card.innerHTML = `
            <div class="pedido-header">
                <div class="pedido-info">
                    <h3>${this.chaNomes[pedido.cha]}</h3>
                    <span class="pedido-cliente">
                        <i class="fas fa-user"></i> ${pedido.cliente}
                    </span>
                    <span class="pedido-id-display">${pedido.id}</span>
                </div>
                <div class="pedido-status" style="background-color: ${status.cor}20; color: ${status.cor}; border-left-color: ${status.cor}">
                    <i class="fas ${status.icon}"></i> ${status.nome}
                </div>
            </div>
            
            <div class="pedido-details">
                <div class="detail-row">
                    <span class="detail-label">Tamanho:</span>
                    <span class="detail-value">${this.tamanhoNomes[pedido.tamanho]}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Preço Unitário:</span>
                    <span class="detail-value">R$ ${pedido.preco.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Data:</span>
                    <span class="detail-value">${dataFormatada}</span>
                </div>
            </div>
            
            ${pedido.observacoes ? `
                <div class="pedido-obs">
                    <strong>Observações:</strong> ${pedido.observacoes}
                </div>
            ` : ''}
                                                                                                
            <div class="pedido-footer">
                <div class="pedido-total">R$ ${pedido.preco.toFixed(2)}</div>
                <div class="pedido-actions">
                    <div class="status-selector">
                        <select class="status-select" data-id="${pedido.id}">
                            <option value="pendente" ${pedido.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="preparando" ${pedido.status === 'preparando' ? 'selected' : ''}>Preparando</option>
                            <option value="pronto" ${pedido.status === 'pronto' ? 'selected' : ''}>Pronto</option>
                            <option value="entregue" ${pedido.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                            <option value="cancelado" ${pedido.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <button class="action-btn edit-btn" data-id="${pedido.id}" title="Editar pedido">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${pedido.id}" title="Excluir pedido">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        
        const deleteBtn = card.querySelector('.delete-btn');
        const editBtn = card.querySelector('.edit-btn');
        const statusSelect = card.querySelector('.status-select');
        
        deleteBtn.addEventListener('click', () => this.confirmarExclusao(pedido.id));
        editBtn.addEventListener('click', () => this.prepararEdicao(pedido));
        statusSelect.addEventListener('change', (e) => this.atualizarStatusPedido(pedido.id, e.target.value));
        
        return card;
    }

    async atualizarStatusPedido(id, novoStatus) {
        try {
            const pedidoAtualizado = await this.pedidoService.atualizarStatusPedido(id, novoStatus);
            if (pedidoAtualizado) {
                this.toastService.mostrar(
                    `Status do pedido ID ${pedidoAtualizado.id} atualizado para: ${this.statusInfo[novoStatus].nome}`,
                    'info'
                );
                await this.atualizarListaPedidos();
            }
        } catch (error) {
            this.toastService.mostrar(`Erro ao atualizar status: ${error.message}`, 'erro');
        }
    }

    async confirmarExclusao(id) {
        if (confirm('Tem certeza que deseja excluir este pedido?')) {
            try {
                const pedidoExcluido = await this.pedidoService.excluirPedido(id);
                if (pedidoExcluido) {
                    this.toastService.mostrar(
                        `Pedido excluído com sucesso!`,
                        'aviso'
                    );
                    await this.atualizarInterface();
                }
            } catch (error) {
                this.toastService.mostrar(`Erro ao excluir pedido: ${error.message}`, 'erro');
            }
        }
    }

    async limparTodosPedidos() {
        try {
            const estatisticas = await this.pedidoService.obterEstatisticas();
            if (estatisticas.total === 0) {
                this.toastService.mostrar('Não há pedidos para limpar.', 'info');               //excluir todos os pedidos
                return;
            }
            
            if (confirm(`Tem certeza que deseja excluir TODOS os ${estatisticas.total} pedidos? Esta ação não pode ser desfeita.`)) {
                const quantidadeExcluida = await this.pedidoService.limparTodosPedidos();
                this.toastService.mostrar(
                    `${quantidadeExcluida} pedidos foram removidos com sucesso!`,
                    'aviso'
                );
                await this.atualizarInterface();
            }
        } catch (error) {
            this.toastService.mostrar(`Erro ao limpar pedidos: ${error.message}`, 'erro');
        }
    }

    // Interface
    async atualizarInterface() {
        try {
                               // Interface
            const estatisticas = await this.pedidoService.obterEstatisticas();
            this.totalPedidos.textContent = estatisticas.total;
            this.pedidosHoje.textContent = estatisticas.hoje;
            this.receitaHoje.textContent = `R$ ${estatisticas.receitaHoje.toFixed(2)}`;
            this.totalReceita.textContent = `R$ ${estatisticas.receitaTotal.toFixed(2)}`;
            
            
            if (this.verPedidosSection.classList.contains('active')) {
                await this.atualizarListaPedidos();
            }
        } catch (error) {
            console.error('Erro ao atualizar interface:', error);
        }
    }

    // Utilitários
    formatarData(dataString) {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}


document.addEventListener('DOMContentLoaded', () => {               //inicialização do dom
    new PedidoController();
});