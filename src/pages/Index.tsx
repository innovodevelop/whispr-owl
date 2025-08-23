import { useState } from "react";
import { MessageCircle, Users, Settings, Search, Plus, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  // Mock data for conversations
  const conversations = [
    { id: "1", name: "Alice Cooper", lastMessage: "Hey, how are you?", time: "2m", unread: 2, avatar: "" },
    { id: "2", name: "Bob Smith", lastMessage: "Thanks for the help!", time: "1h", unread: 0, avatar: "" },
    { id: "3", name: "Team Chat", lastMessage: "Meeting at 3pm", time: "3h", unread: 5, avatar: "", isGroup: true },
    { id: "4", name: "Carol White", lastMessage: "See you tomorrow", time: "1d", unread: 0, avatar: "" },
  ];

  const messages = [
    { id: "1", sender: "Alice Cooper", content: "Hey, how are you doing today?", time: "2:30 PM", isOwn: false },
    { id: "2", sender: "You", content: "I'm doing great! Thanks for asking. How about you?", time: "2:32 PM", isOwn: true },
    { id: "3", sender: "Alice Cooper", content: "I'm good too! Working on some exciting projects.", time: "2:35 PM", isOwn: false },
    { id: "4", sender: "You", content: "That sounds awesome! Would love to hear more about it.", time: "2:37 PM", isOwn: true },
  ];

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Signal</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
                <UserPlus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Plus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedChat(conversation.id)}
              className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                selectedChat === conversation.id ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.avatar} />
                    <AvatarFallback>
                      {conversation.isGroup ? (
                        <Users className="h-6 w-6" />
                      ) : (
                        conversation.name.split(" ").map(n => n[0]).join("")
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unread > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {conversation.unread}
                    </Badge>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">{conversation.name}</h3>
                    <span className="text-xs text-muted-foreground">{conversation.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>AC</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">Alice Cooper</h2>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-2xl ${
                      message.isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {message.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button size="icon">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Welcome to Signal</h2>
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
