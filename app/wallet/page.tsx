"use client";
import { useEffect, useState } from "react";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import { Typography, Card, List, Spin } from "antd";
const { Title, Text } = Typography;

export default function WalletPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/wallet").then(r=>r.json()).then(d=>{setData(d);setLoading(false)}).catch(()=>setLoading(false));
  }, []);
  return (
    <AuthenticatedLayout>
      <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
        <Title level={4} style={{color:"#5C4033"}}>星钻余额</Title>
        {loading ? <Spin /> : (
          <Card style={{background:"#fdf8f0",borderColor:"#ead9c0"}}>
            <Text style={{fontSize:32,color:"#f0a860"}}>&#9733; {data?.balance ?? 0}</Text>
            <Text style={{display:"block",color:"#8B7355",marginTop:8}}>当前星钻余额</Text>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}