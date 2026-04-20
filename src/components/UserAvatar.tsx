import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

const getInitials = (name?: string | null) => {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase()).join("");
};

const UserAvatar = ({ src, name, className, fallbackClassName }: UserAvatarProps) => {
  const initials = getInitials(name);
  return (
    <Avatar className={cn("ring-2 ring-primary/20", className)}>
      <AvatarImage src={src || undefined} alt={name || "User"} />
      <AvatarFallback className={cn("bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold", fallbackClassName)}>
        {initials || <User className="h-1/2 w-1/2" />}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
