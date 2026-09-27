const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

// Inicializa a IA usando a variável de ambiente do Render
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

app.post('/compare', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
        }

        const imageParts = images.map(imgBase64 => ({
            inlineData: {
                data: imgBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg'
            }
        }));

        const promptText = `Analise as etiquetas de preço enviadas e determine a opção com melhor custo-benefício (menor preço por kg, litro ou unidade).
Responda de forma direta e sem formatação markdown (* ou #):

Campeão: [Nome do Produto e Peso/Volume]
Preço: R$ [Preço Total] (R$ [Preço por kg/L/unidade]/kg)
Economia: R$ [Diferença] a menos em relação ao mais caro.`;

        // Chamada à API oficial atualizada
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [promptText, ...imageParts]
        });

        res.json({ analysis: response.text });

    } catch (error) {
        console.error('Erro detalhado no servidor:', error);
        res.status(500).json({ error: 'Erro ao processar imagens no servidor. Verifique os logs.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
