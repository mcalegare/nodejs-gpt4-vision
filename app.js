const express = require('express');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const {OpenAI} = require('openai');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI(process.env.OPENAI_API_KEY);

app.use(bodyParser.json());

app.post('/process-nfce', upload.single('nfceImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Nenhum arquivo foi enviado.');
    }

    const imagePath = req.file.path;

    function toBase64(filePath) {
        const img = fs.readFileSync(filePath);
        
        return Buffer.from(img).toString('base64');
    }


    const image = toBase64(imagePath);

    class Category {
        static rows = [
          {
            id: 1,
            name: 'Meals & Foodstuffs',
            keywords: 'meals, food, groceries, snacks',
            slug: 'food',
            qualified: true
          },
          {
            id: 2,
            name: 'Textbooks & Supplies',
            keywords: 'textbooks, school supplies, office supplies, room decorations, educational materials',
            slug: 'supplies',
            qualified: true
          },
          {
            id: 3,
            name: 'Room & Board',
            keywords: 'rent, utilities',
            slug: 'rent',
            qualified: true
          },
          {
            id: 4,
            name: 'Transportation',
            keywords: 'transportation, public transit, airfare, rideshare',
            slug: 'transportation',
            qualified: false
          },
          {
            id: 999,
            name: 'Other',
            keywords: 'all other expenses',
            slug: 'other',
            qualified: false
          }
        ];
      
        static all() {
          return this.rows;
        }
    }
      
      // Using the Category class to get all categories and map them
      const categoriesString = Category.all()
        .map(category => `${category.slug}: ${category.keywords}`)
        .join("; ");

    try {

        const visionResponse = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            max_tokens:1000,
            messages: [
                {
                    role : "system",
                    content : [
                        {type: "text", text: "Return only JSON without any Markdown formatting or additional text."}
                    ]
                },
                {
                  role: "user",
                  content: [
                    { type: "text", 
                        text:   `
                            Extraia dados deste recibo.
                            Retorne apenas JSON, sem nenhum texto adicional ou formatação Markdown.

                            Retorne os dados como um objeto JSON com as seguintes chaves:
                            - 'date': A data da compra no formato americano, separado por traços
                            - 'store': O nome do negócio ou loja de onde é o recibo. Corrija se não estiver devidamente escrito ou capitalizado.
                            - 'amount': O total geral do recibo sem pontos ou símbolos de moeda. Se não tiver certeza, defina isso como uma string vazia; não tente calcular;
                            - 'description': Uma descrição geral do que foi comprado em português.
                            - 'category': Whichever category is most appropriate ${categoriesString}.
                            - 'payment-method': tente identificar os últimos 4 dígitos do cartão de crédito. Se não tiver certeza, defina isso como uma string vazia;
                            - 'refundable': soma do valor total reembosável
                            - 'items': uma lista com o nome de todos os itens comprados, com nome, categoria do produto, quantidade, valor unitário e valor total da linha, valor reembolsável considerando as regras de reembolso
                            
                            regras de reembolso: 50% do valor total gasto com frutas, nenhuma bebida é reembolsável.

                            converter números e datas para padrão americano
                            If you are unsure about any values, set them to an empty strin
                            `
                    
                    },
                    {
                      type: "image_url",
                      image_url: {
                        "url": `data:image/jpeg;base64,${image}`,
                      },
                    },
                  ],
                },
            ],
        });

        const extractedData = processVisionResponse(visionResponse);

        res.json(extractedData);
    } catch (error) {
        console.error('Erro ao comunicar com a API do GPT-4 Vision:', error);
        res.status(500).send('Erro interno do servidor.');
    } finally {
        fs.unlinkSync(imagePath);
    }
});


const receiptSchema = new mongoose.Schema({
    date: Date,
    store: String,
    amount: Number,
    description: String,
    category: String,
    items: [{
        name: String,
        category:String,
        quantity: Number,
        unit_price: Number,
        total_price: Number
    }]
});
app.post('/add-expenses', (req, res)=>{
    const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

    const extractedData = req.body

    async function run() {
        try {
            await mongoose.connect(process.env.MONGODB_URI, clientOptions);
            const Receipt = mongoose.model('Receipt', receiptSchema);

            const receipt = new Receipt(extractedData);
            await receipt.save();

            res.status(200).send('Dados inseridos com sucesso');
        } catch (error){
            res.status(500).send('Não foi possível adicionar o dados' + error);
        }
        finally {
            await mongoose.disconnect();
        }
    }
    run().catch(console.dir);
})














const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

function processVisionResponse(visionResponse) {
    let json_string = visionResponse.choices[0].message.content;
    processedData = json_string.replace(/```json\n/g, "").replace(/\n```/g, "");

    return JSON.parse(processedData);
}
