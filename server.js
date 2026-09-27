const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Função de tentativa automática para tratar instabilidades 503 do modelo
async function generateContentWithRetry(params, retries = 3, delayMs = 1500) {
    for (let i = 0; i < retries; i++) {
        try {
            return await ai.models.generateContent(params);
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
}

app.post('/compare', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
        }

        const imageParts = images.map(imgBase64 => ({
            inlineData: {
                data: imgBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg'
            }
        }));

        const promptText = `Analise as etiquetas de preço enviadas e determine a opção com melhor custo-benefício (menor preço por kg, litro ou unidade).
Responda RIGOROSAMENTE no seguinte formato de 3 linhas, sem qualquer texto adicional, sem títulos, sem asteriscos e sem marcações em Markdown:

Campeão: [Nome do Produto e Peso/Volume]
Preço: R$ [Preço Total] (R$ [Preço por kg/L/unidade]/kg)
Economia: R$ [Diferença por kg/L/unidade em relação ao produto mais caro] a menos por kg em relação ao produto mais caro.`;

        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-lite',
            contents: [promptText, ...imageParts]
        });

        res.json({ analysis: response.text });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro ao processar imagens no servidor. Tente novamente.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
