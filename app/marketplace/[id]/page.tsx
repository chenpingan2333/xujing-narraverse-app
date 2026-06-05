"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import { Typography, Button, Card, Image, Spin, message } from "antd";
import { ShoppingCartOutlined, ArrowLeftOutlined } from "@ant-design/icons";
const { Title, Text, Paragraph } = Typography;

export default function MarketplaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [char, setChar] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/characters/${id}`).then(r=>r.json()).then(d=>{
      setChar(d.character||d.data?.character); setLoading(false);
    }).catch(()=>setLoading(false));
  }, [id]);

  const buy = async () => {
    const res = await fetch("/api/marketplace/purchase", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ characterId: id }),
    });
    const d = await res.json();
    if (res.ok) { message.success("购买成功"); router.push("/characters"); }
    else { message.error(d.error ?? "购买失败"); }
  };

  if (loading) return <AuthenticatedLayout><Spin style={{display:"block",margin:"40px auto"}}/></AuthenticatedLayout>;
  if (!char) return <AuthenticatedLayout><Text>角色不存在</Text></AuthenticatedLayout>;

  const img = char.avatar?.startsWith("/") ? char.avatar : `/characters/${char.name}.png`;
  return (
    <AuthenticatedLayout>
      <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
        <Button icon={<ArrowLeftOutlined/>} type="text" onClick={()=>router.back()} style={{marginBottom:16,color:"#B08968"}}>返回</Button>
        <Card style={{background:"#fdf8f0",borderColor:"#ead9c0"}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <Image src={img} alt={char.name} width={160} height={160} style={{borderRadius:16,objectFit:"cover"}} fallback="/characters/橘光.png" />
          </div>
          <Title level={4} style={{color:"#5C4033",textAlign:"center"}}>{char.display_name||char.name}</Title>
          <Paragraph style={{color:"#8B7355"}}>{char.display_description||char.persona||char.description}</Paragraph>
          {char.world_view && <Paragraph style={{color:"#B08968",fontSize:13}}>世界观：{char.world_view}</Paragraph>}
          {char.opening_message && <Paragraph style={{color:"#B08968",fontSize:13}}>开场白：{char.opening_message}</Paragraph>}
          {char.price_star > 0 && (
            <div style={{textAlign:"center",marginTop:16}}>
              <Text style={{fontSize:20,color:"#f0a860"}}>&#9733; {char.price_star}</Text>
              <Button block type="primary" icon={<ShoppingCartOutlined/>} onClick={buy}
                style={{marginTop:12,height:44,borderRadius:12,background:"linear-gradient(135deg,#f6c177,#f0a860)",border:"none",color:"#fffdf9"}}>
                购买角色
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}