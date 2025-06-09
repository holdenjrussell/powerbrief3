const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkContractData() {
  try {
    // Get the most recent contract
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('id, title, document_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching contracts:', error);
      return;
    }

    console.log('Recent contracts:');
    contracts.forEach(contract => {
      console.log(`- ${contract.id}: ${contract.title} (${contract.document_name})`);
    });

    if (contracts.length > 0) {
      // Check the document data of the most recent contract
      const { data: contractWithData, error: dataError } = await supabase
        .from('contracts')
        .select('id, document_data')
        .eq('id', contracts[0].id)
        .single();

      if (dataError) {
        console.error('Error fetching contract data:', dataError);
        return;
      }

      console.log('\nDocument data for most recent contract:');
      console.log('- Has data:', !!contractWithData.document_data);
      
      if (contractWithData.document_data) {
        // Check the type and format
        const data = contractWithData.document_data;
        console.log('- Data type:', typeof data);
        
        if (typeof data === 'string') {
          console.log('- String length:', data.length);
          console.log('- First 50 chars:', data.substring(0, 50));
          console.log('- Starts with \\x:', data.startsWith('\\x'));
        } else if (data instanceof Buffer || data instanceof Uint8Array) {
          console.log('- Buffer/Uint8Array length:', data.length);
          const bytes = data instanceof Buffer ? data : Buffer.from(data);
          console.log('- First 10 bytes (hex):', bytes.slice(0, 10).toString('hex'));
          console.log('- Is PDF:', bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
        } else if (data && typeof data === 'object') {
          console.log('- Object keys:', Object.keys(data));
          console.log('- Object:', JSON.stringify(data).substring(0, 100));
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkContractData(); 