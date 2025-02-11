import Retell from 'retell-sdk';

const client = new Retell({
    apiKey: 'key_47ac7f82a15ee4d365c8641add4f',
  });

  async function main() {
    const knowledgeBaseResponse = await client.knowledgeBase.create({
      knowledge_base_name: "Sample KB",
      knowledge_base_texts: [
        {
          text: "Hello, how are you?",
          title: "Sample Question",
        },
      ],
      knowledge_base_urls: [
        "https://www.retellai.com",
        "https://docs.retellai.com",
      ]
    });
  
    console.log(knowledgeBaseResponse.knowledge_base_id);
  }
  
  main();