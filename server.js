const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

// Configurar o Gemini SDK (usando a variável de ambiente GEMINI_API_KEY do Render)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Aumentar o limite do corpo das requisições para aceitar várias imagens em Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir arquivos estáticos da pasta public
app.use(express.static('public'));

// Endpoint para comparar os preços usando o Gemini
app.post('/compare', async (expressReq, res) => {
    try {
        const { images } = expressReq.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
        }

        // Preparar as imagens para o formato esperado pelo Gemini SDK
        const imageParts = [];

        for (let imgBase64 of images) {
            // Remover o prefixo data:image/...;base64, se existir
            const base64Data = imgBase64.replace(/^data:image\/\w+;base64,/, '');
            
            imageParts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            });
        }

        const promptText = "Analise estas etiquetas de preços de supermercado. Identifique os produtos, os pesos/volumes e os preços unitários/totais. Compare-as detalhadamente e indique qual é a melhor opção de compra com base no custo-benefício (preço por quilo ou unidade). Seja claro e direto.";

        // Chamar o modelo Gemini atualizado e compatível
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [promptText, ...imageParts]
        });

        res.json({ analysis: response.text });

    } catch (error) {
        console.error('Erro no servidor ao processar imagens:', error);
        res.status(500).json({ error: error.message || 'Erro ao processar as imagens no servidor.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor a correr na porta ${port}`);
});
